import type { Components, Events, Resources } from "@/types";
import { Bundle } from "ecspresso";

const MAX_COLLISION_RETRIES = 3; // Ensure this matches collision.bundle.ts

export default
function movementBundle() {
	return new Bundle<Components, Events, Resources>()
		.addSystem('process-waypoint')
		.addQuery('stationaryEntitiesWithWaypoints', {
			with: ['waypoints', 'position'],
			without: ['moveTarget'],
		})
		.setProcess((data, deltaTime, { entityManager }) => {
			for (const entity of data.stationaryEntitiesWithWaypoints) {
				const waypoints = entity.components.waypoints;
				const nextWaypoint = waypoints.shift();

				if (nextWaypoint) {
					entityManager.removeComponent(entity.id, 'movementState'); // Reset state for new target
					entityManager.addComponent(entity.id, 'moveTarget', nextWaypoint);
				} 
				// If shift returned undefined (empty array) and waypoints component still exists
				if(waypoints.length === 0){
					entityManager.removeComponent(entity.id, 'waypoints');
				}
			}
		})
		.setEventHandlers({
			setMoveTarget: {
				handler(data, { entityManager }) {
					const {
						entity,
						queue,
						moveTarget,
					} = data;

					if(queue) {
						const waypoints = entity.components.waypoints || [];
						waypoints.push(moveTarget);
						if(!entity.components.waypoints) {
							entityManager.addComponent(entity.id, 'waypoints', waypoints);
						}
					} else {
						// If not queuing, clear existing waypoints and movement state
						entityManager.removeComponent(entity.id, 'waypoints');
						entityManager.removeComponent(entity.id, 'movementState');
						entityManager.addComponent(entity, 'moveTarget', moveTarget);
					}
				}
			}
		})
		.bundle
		.addSystem('move-toward-target')
		// Query needs to include optional movementState and collisionDetected
		.addQuery('moveTargetEntities', { with: ['moveTarget', 'position', 'speed'] })
		.setProcess((data, deltaTime, { entityManager }) => {
			for (const entity of data.moveTargetEntities) {

				// 1. Check for collision detected flag from collision system
				if (entity.components.collisionDetected) {
					entityManager.removeComponent(entity.id, 'collisionDetected');
					continue; // Skip movement this frame due to collision
				}

				const movementState = entity.components.movementState;

				// 2. Check movement state (pause timer, retries)
				if (movementState) {
					if (movementState.collisionPauseTimer > 0) {
						movementState.collisionPauseTimer -= deltaTime;
						continue; // Skip movement while paused
					}
					if (movementState.collisionRetryCount >= MAX_COLLISION_RETRIES) {
						// Give up
						entityManager.removeComponent(entity.id, 'moveTarget');
						entityManager.removeComponent(entity.id, 'movementState');
						continue; // Skip movement
					}
				}

				// 3. Perform movement if not paused or giving up
				const target = entity.components.moveTarget;
				const pos = entity.components.position;
				const speed = entity.components.speed;
				const dx = target.x - pos.x;
				const dy = target.y - pos.y;
				const dist = Math.sqrt(dx * dx + dy * dy);

				if (dist === 0) { // Already at target (or somehow got exactly there)
					entityManager.removeComponent(entity.id, 'moveTarget');
					entityManager.removeComponent(entity.id, 'movementState');
					continue;
				}

				const moveDist = speed * deltaTime;

				if (moveDist >= dist) {
					// Reached target
					pos.x = target.x;
					pos.y = target.y;
					entityManager.removeComponent(entity.id, 'moveTarget');
					entityManager.removeComponent(entity.id, 'movementState');
				} else {
					// Move toward target
					const ratio = moveDist / dist;
					pos.x += dx * ratio;
					pos.y += dy * ratio;

					// If we moved successfully, reset collision retry count
					if (movementState) {
						movementState.collisionRetryCount = 0;
					}
				}
			}
		})
		.bundle
		.addSystem('update-sprite-position')
		.addQuery('updatedSpritePositionEntities', { with: ['renderContainer', 'position'] }) // No longer need moveTarget here
		.setProcess((data, deltaTime) => {
			for (const entity of data.updatedSpritePositionEntities) {
				if(
					entity.components.renderContainer.x === entity.components.position.x &&
					entity.components.renderContainer.y === entity.components.position.y
				) {
					// Avoid unnecessary updates if position hasn't changed
					// Important now that entities might pause
					continue; 
				}

				entity.components.renderContainer.x = entity.components.position.x;
				entity.components.renderContainer.y = entity.components.position.y;
			}
		})
		.bundle;
}