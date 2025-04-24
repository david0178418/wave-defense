import type { Components, Events, Resources, Vector2D, CollisionTargetTag } from "@/types";
import { Bundle, type Entity } from "ecspresso";
import {
	MAX_COLLISION_RETRIES,
	AVOIDANCE_DURATION,
	COLLISION_PAUSE_DURATION,
	AVOIDANCE_BIAS_FACTOR,
	BIAS_RANDOMNESS,
	PAUSE_RANDOMNESS
} from "@/constants"; // Import shared constants
import { normalize, dot } from "@/utils"; // Import vector helpers

// Helper function to check tags
function hasMatchingTag(entity: Entity<Components>, tags: CollisionTargetTag[]): boolean {
	// Explicitly check each possible tag component
	for (const tag of tags) {
		switch (tag) {
			case 'baseTag': if (entity.components.baseTag) return true; break;
			case 'playerUnitTag': if (entity.components.playerUnitTag) return true; break;
			case 'enemyUnit': if (entity.components.enemyUnit) return true; break;
			// Add cases for any future tags
		}
	}
	return false;
}

export default
function collisionBundle() {
	return new Bundle<Components, Events, Resources>()
		.addSystem('detect-collisions')
		.addQuery('movingEntities', { with: ['moveTarget', 'position', 'speed', 'collisionBody'] })
		.addQuery('colliders', { with: ['position', 'collisionBody'] })
		.setProcess((data, deltaTime, { entityManager }) => {
			const allColliders = Array.from(data.colliders);

			for (const movingEntity of data.movingEntities) {
				const target = movingEntity.components.moveTarget;
				const pos = movingEntity.components.position;
				const speed = movingEntity.components.speed;
				const body = movingEntity.components.collisionBody;
				
				// Vector towards target & perpendiculars (needed for avoidance calc later)
				const V_to_target = { x: target.x - pos.x, y: target.y - pos.y };
				const distToTarget = Math.sqrt(V_to_target.x * V_to_target.x + V_to_target.y * V_to_target.y);
				const N_to_target = distToTarget > 0 ? { x: V_to_target.x / distToTarget, y: V_to_target.y / distToTarget } : { x: 1, y: 0 };
				const P1_target = { x: -N_to_target.y, y: N_to_target.x };
				const P2_target = { x: N_to_target.y, y: -N_to_target.x };
				
				// Skip check if already avoiding/paused
				const existingMovementState = entityManager.getComponent(movingEntity.id, 'movementState');
				if (existingMovementState && (existingMovementState.avoidanceTimer > 0 || existingMovementState.collisionPauseTimer > 0)) {
					continue;
				}
				// No need to check retry count here, movement system handles give up

				// Calculate potential next position
				const moveDist = speed * deltaTime;
				const ratio = distToTarget > 0 ? Math.min(1, moveDist / distToTarget) : 1;
				const nextX = pos.x + V_to_target.x * ratio;
				const nextY = pos.y + V_to_target.y * ratio;

				let movingEntityWillBeRemoved = false;

				for (const otherEntity of allColliders) {
					if (movingEntity.id === otherEntity.id) continue;

					const otherPos = otherEntity.components.position;
					const otherBody = otherEntity.components.collisionBody;
					const collisionDist = body.radius + otherBody.radius;
					const dxNext = nextX - otherPos.x;
					const dyNext = nextY - otherPos.y;
					const distSqNext = dxNext * dxNext + dyNext * dyNext;

					if (distSqNext < collisionDist * collisionDist) {
						// Collision detected! Check relative movement direction first.
						
						// Vector from other entity to moving entity (current position)
						const V_other_to_moving = { x: pos.x - otherPos.x, y: pos.y - otherPos.y };
						
						// Intended move vector for this frame
						const moveVec = { x: nextX - pos.x, y: nextY - pos.y };
						
						// If moving away from the obstacle, ignore this collision pair
						const dotProduct = dot(moveVec, V_other_to_moving);
						if (dotProduct >= 0) {
							continue; // Skip collision response (damage/avoidance)
						}

						// --- Collision Response (Damage/Avoidance) --- 
						// If dotProduct was negative, proceed with damage checks and potential avoidance

						let damageDealt = false;
						movingEntityWillBeRemoved = false; // Reset flag for this collision pair

						// Check if movingEntity deals damage to otherEntity
						const attackerComp = movingEntity.components.dealsDamageOnCollision;
						if (attackerComp && hasMatchingTag(otherEntity, attackerComp.targetTags)) {
							const targetHealth = entityManager.getComponent(otherEntity.id, 'health');
							if (targetHealth) {
								targetHealth.current -= attackerComp.amount;
								damageDealt = true;
								if (attackerComp.destroySelf) {
									entityManager.addComponent(movingEntity.id, 'toBeRemoved', true);
									movingEntityWillBeRemoved = true;
								}
							}
						}
						
						// Check if otherEntity deals damage to movingEntity
						const otherAttackerComp = otherEntity.components.dealsDamageOnCollision;
						if (otherAttackerComp && hasMatchingTag(movingEntity, otherAttackerComp.targetTags)) {
							const targetHealth = entityManager.getComponent(movingEntity.id, 'health');
							if (targetHealth) {
								targetHealth.current -= otherAttackerComp.amount;
								damageDealt = true;
								if (otherAttackerComp.destroySelf) {
									entityManager.addComponent(otherEntity.id, 'toBeRemoved', true);
									// Don't set movingEntityWillBeRemoved here, only if the moving entity itself is destroyed
								}
							}
						}

						// --- Initiate pause/avoidance only if moving entity wasn't destroyed by damage --- 
						if (!movingEntityWillBeRemoved) {
							// Get or add movement state
							let movementState = entityManager.getComponent(movingEntity.id, 'movementState');
							let initialState: Components['movementState']; // Define initial state structure
							if (!movementState) {
								initialState = { // Create the initial state object
									collisionPauseTimer: 0,
									avoidanceTimer: 0,
									avoidanceDirection: { x: 0, y: 0 }, 
									collisionRetryCount: 0, // Start at 0
								};
								entityManager.addComponent(movingEntity.id, 'movementState', initialState);
								movementState = initialState; // Use the local object reference
							}
							if (!movementState) {
								console.error("Failed get/add movementState"); continue;
							}
							const currentRetryCount = movementState.collisionRetryCount;
							const newRetryCount = currentRetryCount + 1;
							movementState.collisionRetryCount = newRetryCount;

							if (newRetryCount < MAX_COLLISION_RETRIES) {
								const hitObstaclePos = otherPos;
								const V_obs_to_curr = { x: pos.x - hitObstaclePos.x, y: pos.y - hitObstaclePos.y };
								const N_obs_to_curr = normalize(V_obs_to_curr);
								const P1_obs = { x: -N_obs_to_curr.y, y: N_obs_to_curr.x };
								const P2_obs = { x: N_obs_to_curr.y, y: -N_obs_to_curr.x };
								const chosen_P_obs = dot(P1_obs, N_to_target) >= dot(P2_obs, N_to_target) ? P1_obs : P2_obs;
								const chosen_P_target = dot(P1_target, chosen_P_obs) >= dot(P2_target, chosen_P_obs) ? P1_target : P2_target;
								const randomBiasFactor = AVOIDANCE_BIAS_FACTOR + (Math.random() - 0.5) * BIAS_RANDOMNESS;
								const effectiveBiasFactor = Math.max(0, Math.min(1, randomBiasFactor)); 
								const biasedVecX = chosen_P_obs.x + chosen_P_target.x * effectiveBiasFactor;
								const biasedVecY = chosen_P_obs.y + chosen_P_target.y * effectiveBiasFactor;
								const finalAvoidanceDir = normalize({ x: biasedVecX, y: biasedVecY }, chosen_P_obs);
								const randomPauseDuration = COLLISION_PAUSE_DURATION + (Math.random() - 0.5) * PAUSE_RANDOMNESS;
								const effectivePauseDuration = Math.max(0, randomPauseDuration);

								// Update state fields - Use non-null assertion
								movementState!.collisionPauseTimer = effectivePauseDuration;
								movementState!.avoidanceTimer = AVOIDANCE_DURATION;
								movementState!.avoidanceDirection = finalAvoidanceDir;
							}
						}
						break; // Collision processed (either ignored, damage dealt, or avoidance started)
					}
				}
			}
		})
		.bundle;
} 