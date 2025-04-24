import type { Components, Events, Resources, Vector2D } from "@/types";
import { Bundle } from "ecspresso";
import {
	MAX_COLLISION_RETRIES,
	AVOIDANCE_DURATION,
	COLLISION_PAUSE_DURATION,
	AVOIDANCE_BIAS_FACTOR,
	BIAS_RANDOMNESS,
	PAUSE_RANDOMNESS
} from "@/constants"; // Import shared constants
import { normalize, dot } from "@/utils"; // Import vector helpers

export default
function collisionBundle() {
	return new Bundle<Components, Events, Resources>()
		.addSystem('detect-collisions')
		.addQuery('movingEntities', {
			with: ['moveTarget', 'position', 'speed', 'collisionBody'],
			// We will filter entities currently in avoidance mode manually below
		})
		.addQuery('colliders', { with: ['position', 'collisionBody'] })
		.setProcess((data, deltaTime, { entityManager }) => {
			const allColliders = Array.from(data.colliders);

			for (const movingEntity of data.movingEntities) {
				const movementState = movingEntity.components.movementState;
				// Skip collision checks if already in avoidance mode
				if (movementState && movementState.avoidanceTimer > 0) {
					continue;
				}

				const target = movingEntity.components.moveTarget;
				const pos = movingEntity.components.position;
				const speed = movingEntity.components.speed;
				const body = movingEntity.components.collisionBody;

				// Vector towards target
				const V_to_target = { x: target.x - pos.x, y: target.y - pos.y };
				const distToTarget = Math.sqrt(V_to_target.x * V_to_target.x + V_to_target.y * V_to_target.y);
				if (distToTarget === 0) continue;
				const N_to_target = { x: V_to_target.x / distToTarget, y: V_to_target.y / distToTarget };

				// Perpendiculars to target path
				const P1_target = { x: -N_to_target.y, y: N_to_target.x };
				const P2_target = { x: N_to_target.y, y: -N_to_target.x };

				// Calculate potential next position (needed for collision check)
				const moveDist = speed * deltaTime;
				const ratio = Math.min(1, moveDist / distToTarget);
				const nextX = pos.x + V_to_target.x * ratio;
				const nextY = pos.y + V_to_target.y * ratio;

				let collisionFound = false;
				let hitObstaclePos: Vector2D | null = null;

				for (const otherEntity of allColliders) {
					if (movingEntity.id === otherEntity.id) continue;
					const otherPos = otherEntity.components.position;
					const otherBody = otherEntity.components.collisionBody;
					const collisionDist = body.radius + otherBody.radius;
					const dxNext = nextX - otherPos.x;
					const dyNext = nextY - otherPos.y;
					const distSqNext = dxNext * dxNext + dyNext * dyNext;

					if (distSqNext < collisionDist * collisionDist) {
						collisionFound = true;
						hitObstaclePos = otherPos;
						break;
					}
				}

				if (collisionFound && hitObstaclePos) {
					// Get or add movement state
					let movementState = entityManager.getComponent(movingEntity.id, 'movementState');
					if (!movementState) {
						entityManager.addComponent(movingEntity.id, 'movementState', { // Add without assigning result
							collisionPauseTimer: 0,
							avoidanceTimer: 0,
							avoidanceDirection: { x: 0, y: 0 }, 
							collisionRetryCount: 0, // Start at 0
						});
						movementState = entityManager.getComponent(movingEntity.id, 'movementState'); // Get it again immediately
					}

					// Type guard: If state somehow still doesn't exist, something is wrong.
					if (!movementState) {
						console.error("Failed to get or add movementState for entity:", movingEntity.id);
						continue; // Skip processing this entity
					}
					
					// Calculate and update retry count (state is guaranteed non-null here)
					const currentRetryCount = movementState.collisionRetryCount;
					const newRetryCount = currentRetryCount + 1;
					movementState.collisionRetryCount = newRetryCount;

					// --- Initiate pause/avoidance only if below retry limit --- 
					if (newRetryCount < MAX_COLLISION_RETRIES) {
						// Calculate Avoidance Direction (with randomized bias)
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

						// Calculate randomized pause duration
						const randomPauseDuration = COLLISION_PAUSE_DURATION + (Math.random() - 0.5) * PAUSE_RANDOMNESS;
						const effectivePauseDuration = Math.max(0, randomPauseDuration);

						// Update remaining state fields (timers, direction) 
						// state is guaranteed non-null here
						movementState.collisionPauseTimer = effectivePauseDuration;
						movementState.avoidanceTimer = AVOIDANCE_DURATION;
						movementState.avoidanceDirection = finalAvoidanceDir;
						
						// Signal movement system removed
					}
				}
			}
		})
		.bundle;
} 