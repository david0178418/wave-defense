import type { Components, Events, Resources, CollisionTargetTag } from "@/types";
import { Bundle, type Entity } from "ecspresso";
import {
	MAX_COLLISION_RETRIES,
	AVOIDANCE_DURATION,
	COLLISION_PAUSE_DURATION,
	AVOIDANCE_BIAS_FACTOR,
	BIAS_RANDOMNESS,
	PAUSE_RANDOMNESS
} from "@/constants"; // Import shared constants
import { normalize, dot, intersectLineSegmentCircle } from "@/utils"; // Import vector helpers and new util

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
		// Querying movingEntities which might include projectiles
		.addQuery('movingEntities', { with: ['position', 'collisionBody'], without: ['toBeRemoved'] })
		.addQuery('colliders', { with: ['position', 'collisionBody'], without: ['toBeRemoved'] })
		.setProcess((data, deltaTime, { entityManager }) => {
			const allColliders = Array.from(data.colliders);

			for (const movingEntity of data.movingEntities) {
				const pos = movingEntity.components.position!;
				const body = movingEntity.components.collisionBody!;
				const isProjectile = movingEntity.components.projectile === true;
				const velocity = movingEntity.components.velocity;
				const moveTarget = movingEntity.components.moveTarget;
				const speed = movingEntity.components.speed;

				// Calculate potential next position & move vector
				let nextX = pos.x, nextY = pos.y;
				let moveVec = { x: 0, y: 0 };
				// Declare target-related vectors needed later for avoidance
				let N_to_target = { x: 1, y: 0 }; // Default facing right
				let P1_target = { x: 0, y: 1 };  // Default perpendicular up
				let P2_target = { x: 0, y: -1 }; // Default perpendicular down

				if (isProjectile && velocity) {
					moveVec = { x: velocity.x * deltaTime, y: velocity.y * deltaTime };
					nextX += moveVec.x;
					nextY += moveVec.y;
				} else if (moveTarget && speed) {
					// Skip check if already avoiding/paused
					const existingMovementState = entityManager.getComponent(movingEntity.id, 'movementState');
					if (existingMovementState && (existingMovementState.avoidanceTimer > 0 || existingMovementState.collisionPauseTimer > 0)) {
						continue;
					}
					
					const V_to_target = { x: moveTarget.x - pos.x, y: moveTarget.y - pos.y };
					const distToTarget = Math.sqrt(V_to_target.x * V_to_target.x + V_to_target.y * V_to_target.y);
					if (distToTarget === 0) continue; 
					
					// Calculate normalized target direction and perpendiculars *here*
					N_to_target = { x: V_to_target.x / distToTarget, y: V_to_target.y / distToTarget };
					P1_target = { x: -N_to_target.y, y: N_to_target.x };
					P2_target = { x: N_to_target.y, y: -N_to_target.x };
					
					const moveDist = speed * deltaTime;
					const ratio = Math.min(1, moveDist / distToTarget);
					moveVec = { x: V_to_target.x * ratio, y: V_to_target.y * ratio };
					nextX += moveVec.x;
					nextY += moveVec.y;
				} else {
					continue; // Entity isn't moving
				}

				for (const otherEntity of allColliders) {
					if (movingEntity.id === otherEntity.id) continue;

					const otherPos = otherEntity.components.position!;
					const otherBody = otherEntity.components.collisionBody!;
					const combinedRadius = body.radius + otherBody.radius;

					let collisionOccurred = false;
					if (isProjectile) {
						// Use swept check for projectiles
						collisionOccurred = intersectLineSegmentCircle(pos, { x: nextX, y: nextY }, otherPos, otherBody.radius);
					} else {
						// Use point check for non-projectiles
						const dxNext = nextX - otherPos.x;
						const dyNext = nextY - otherPos.y;
						const distSqNext = dxNext * dxNext + dyNext * dyNext;
						collisionOccurred = distSqNext < combinedRadius * combinedRadius;
					}

					if (collisionOccurred) {
						// Check relative movement to potentially ignore collision
						const V_other_to_moving = { x: pos.x - otherPos.x, y: pos.y - otherPos.y };
						const dotProduct = dot(moveVec, V_other_to_moving);
						if (dotProduct >= 0 && !isProjectile) { // Only ignore if NOT a projectile
							continue; // Skip collision response
						}

						// --- Collision Response (Damage/Avoidance) --- 
						let damageDealt = false;
						let movingEntityWillBeRemoved = false;
						let isProjectileTargetCollision = false;

						// Check movingEntity deals damage
						const attackerComp = movingEntity.components.dealsDamageOnCollision;
						if (attackerComp && hasMatchingTag(otherEntity, attackerComp.targetTags)) {
							const targetHealth = entityManager.getComponent(otherEntity.id, 'health');
							if (targetHealth) {
								targetHealth.current -= attackerComp.amount;
								damageDealt = true;
								if (isProjectile) isProjectileTargetCollision = true; // Track projectile hit
								if (attackerComp.destroySelf) {
									entityManager.addComponent(movingEntity.id, 'toBeRemoved', true);
									movingEntityWillBeRemoved = true;
								}
							}
						}
						
						// Check otherEntity deals damage
						const otherAttackerComp = otherEntity.components.dealsDamageOnCollision;
						if (!movingEntityWillBeRemoved && otherAttackerComp && hasMatchingTag(movingEntity, otherAttackerComp.targetTags)) {
							const targetHealth = entityManager.getComponent(movingEntity.id, 'health');
							if (targetHealth) {
								targetHealth.current -= otherAttackerComp.amount;
								damageDealt = true;
								if (otherEntity.components.projectile) isProjectileTargetCollision = true; // Track projectile hit
								if (otherAttackerComp.destroySelf) {
									entityManager.addComponent(otherEntity.id, 'toBeRemoved', true);
								}
							}
						}

						// --- Initiate pause/avoidance only if moving entity wasn't destroyed AND it wasn't a projectile hitting its target --- 
						if (!movingEntityWillBeRemoved && !isProjectileTargetCollision && !isProjectile) { // Also check !isProjectile to prevent projectiles from avoiding
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
								// Calculate Avoidance Direction
								const hitObstaclePos = otherPos;
								const V_obs_to_curr = { x: pos.x - hitObstaclePos.x, y: pos.y - hitObstaclePos.y };
								const N_obs_to_curr = normalize(V_obs_to_curr);
								const P1_obs = { x: -N_obs_to_curr.y, y: N_obs_to_curr.x };
								const P2_obs = { x: N_obs_to_curr.y, y: -N_obs_to_curr.x };
								// Uses N_to_target, P1_target, P2_target calculated earlier
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
						break; // Collision processed
					}
				}
			}
		})
		.bundle;
} 