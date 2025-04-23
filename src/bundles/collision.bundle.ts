import type { Components, Events, Resources, Vector2D } from "@/types";
import { Bundle } from "ecspresso";

const AVOIDANCE_DURATION = 0.3; // seconds
const COLLISION_PAUSE_DURATION = 0.2; // seconds
const MAX_COLLISION_RETRIES = 3;
const AVOIDANCE_BIAS_FACTOR = 0.5; // How much to curve towards target during avoidance (0=pure perpendicular, 1=mostly target)

export default
function collisionBundle() {
	return new Bundle<Components, Events, Resources>()
		.addSystem('detect-collisions')
		.addQuery('movingEntities', {
			with: ['moveTarget', 'position', 'speed', 'collisionBody'],
			// We will filter entities currently in avoidance mode manually below
			without: ['collisionDetected'], // Avoid re-flagging in the same tick
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

				// Calculate potential next position based on target
				const dx = target.x - pos.x;
				const dy = target.y - pos.y;
				const dist = Math.sqrt(dx * dx + dy * dy);
				if (dist === 0) continue;
				const moveDist = speed * deltaTime;
				const ratio = Math.min(1, moveDist / dist);
				const nextX = pos.x + dx * ratio;
				const nextY = pos.y + dy * ratio;

				let collisionFound = false;
				let collisionVector: Vector2D | null = null; // Store vector FROM obstacle TO moving entity

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
						// Use the vector from the collided object to the potential next position
						collisionVector = { x: dxNext, y: dyNext };
						break;
					}
				}

				if (collisionFound && collisionVector) {
					const currentRetryCount = movementState?.collisionRetryCount || 0;
					const newRetryCount = currentRetryCount + 1;

					// Calculate base perpendicular avoidance direction
					const cvLength = Math.sqrt(collisionVector.x * collisionVector.x + collisionVector.y * collisionVector.y);
					let perpDir: Vector2D;
					if (cvLength > 0) {
						const nx = collisionVector.x / cvLength;
						const ny = collisionVector.y / cvLength;
						if (Math.random() < 0.5) {
							perpDir = { x: -ny, y: nx }; 
						} else {
							perpDir = { x: ny, y: -nx };
						}
					} else {
						perpDir = { x: 1, y: 0 }; // Fallback
					}

					// Calculate normalized direction towards the target
					const targetDir = { x: dx / dist, y: dy / dist }; // dist is non-zero here

					// Blend perpendicular direction with target direction
					const biasedVecX = perpDir.x + targetDir.x * AVOIDANCE_BIAS_FACTOR;
					const biasedVecY = perpDir.y + targetDir.y * AVOIDANCE_BIAS_FACTOR;
					const biasedVecLen = Math.sqrt(biasedVecX * biasedVecX + biasedVecY * biasedVecY);

					let finalAvoidanceDir: Vector2D;
					if (biasedVecLen > 0) {
						finalAvoidanceDir = { x: biasedVecX / biasedVecLen, y: biasedVecY / biasedVecLen };
					} else {
						finalAvoidanceDir = perpDir; // Fallback to pure perpendicular if bias cancels out
					}

					// Add or update movement state for pause and subsequent avoidance
					if (movementState) {
						movementState.collisionPauseTimer = COLLISION_PAUSE_DURATION;
						movementState.avoidanceTimer = AVOIDANCE_DURATION;
						movementState.avoidanceDirection = finalAvoidanceDir;
						movementState.collisionRetryCount = newRetryCount;
					} else {
						entityManager.addComponent(movingEntity.id, 'movementState', {
							collisionPauseTimer: COLLISION_PAUSE_DURATION,
							avoidanceTimer: AVOIDANCE_DURATION,
							avoidanceDirection: finalAvoidanceDir,
							collisionRetryCount: newRetryCount,
						});
					}

					// Signal movement system
					if (newRetryCount <= MAX_COLLISION_RETRIES) {
						entityManager.addComponent(movingEntity.id, 'collisionDetected', true);
					}
				}
			}
		})
		.bundle;
} 