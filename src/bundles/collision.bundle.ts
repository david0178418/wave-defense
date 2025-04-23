import type { Components, Events, Resources } from "@/types";
import { Bundle } from "ecspresso";

const COLLISION_PAUSE_DURATION = 0.2; // seconds
const MAX_COLLISION_RETRIES = 5;

export default
function collisionBundle() {
	return new Bundle<Components, Events, Resources>()
		.addSystem('detect-collisions')
		.addQuery('movingEntities', {
			with: ['moveTarget', 'position', 'speed', 'collisionBody'],
			// We will filter paused entities manually below
			without: ['collisionDetected'], // Avoid re-flagging in the same tick
		})
		.addQuery('colliders', { with: ['position', 'collisionBody'] })
		.setProcess((data, deltaTime, { entityManager }) => {
			const allColliders = Array.from(data.colliders);

			for (const movingEntity of data.movingEntities) {
				// Filter out paused entities manually
				const movementState = movingEntity.components.movementState;
				if (movementState && movementState.collisionPauseTimer > 0) {
					continue;
				}

				const target = movingEntity.components.moveTarget;
				const pos = movingEntity.components.position;
				const speed = movingEntity.components.speed;
				const body = movingEntity.components.collisionBody;

				// Calculate potential next position
				const dx = target.x - pos.x;
				const dy = target.y - pos.y;
				const dist = Math.sqrt(dx * dx + dy * dy);
				if (dist === 0) continue;
				const moveDist = speed * deltaTime;
				const ratio = Math.min(1, moveDist / dist);
				const nextX = pos.x + dx * ratio;
				const nextY = pos.y + dy * ratio;

				let collisionFound = false;
				for (const otherEntity of allColliders) {
					if (movingEntity.id === otherEntity.id) continue;

					const otherPos = otherEntity.components.position;
					const otherBody = otherEntity.components.collisionBody;

					// Simple circle collision check
					const collisionDist = body.radius + otherBody.radius;
					const dxNext = nextX - otherPos.x;
					const dyNext = nextY - otherPos.y;
					const distSqNext = dxNext * dxNext + dyNext * dyNext;

					if (distSqNext < collisionDist * collisionDist) {
						collisionFound = true;
						break;
					}
				}

				if (collisionFound) {
					let currentRetryCount = 0;
					if (movementState) {
						currentRetryCount = movementState.collisionRetryCount;
					}
					const newRetryCount = currentRetryCount + 1;

					// Add or update movement state
					if (movementState) {
						movementState.collisionPauseTimer = COLLISION_PAUSE_DURATION;
						movementState.collisionRetryCount = newRetryCount;
					} else {
						entityManager.addComponent(movingEntity.id, 'movementState', {
							collisionPauseTimer: COLLISION_PAUSE_DURATION,
							collisionRetryCount: newRetryCount,
						});
					}

					// Add temporary component to signal movement system
					// Only add if retry count hasn't exceeded max (give up happens in movement system)
					if(newRetryCount <= MAX_COLLISION_RETRIES) {
						entityManager.addComponent(movingEntity.id, 'collisionDetected', true);
					}
				}
			}
		})
		.bundle;
} 