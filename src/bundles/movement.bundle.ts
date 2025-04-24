import type { Components, Events, Resources } from "@/types";
import { Bundle } from "ecspresso";
import { MAX_COLLISION_RETRIES } from "@/constants"; // Import shared constant


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
				const pos = entity.components.position;
				const speed = entity.components.speed;
				const moveDist = speed * deltaTime;

				// Check for collision detected flag *first*
				if (entity.components.collisionDetected) {
					entityManager.removeComponent(entity.id, 'collisionDetected');
				}

				const movementState = entity.components.movementState;

				// Order matters: Give Up -> Pause -> Avoid -> Move Target

				// 1. Check if giving up (retries exceeded)
				if (movementState && movementState.collisionRetryCount >= MAX_COLLISION_RETRIES) {
					// Give up
					entityManager.removeComponent(entity.id, 'moveTarget');
					entityManager.removeComponent(entity.id, 'movementState');
					continue; // Skip movement
				}

				// 2. Check pause state
				if (movementState && movementState.collisionPauseTimer > 0) {
					movementState.collisionPauseTimer -= deltaTime;
					continue; // Skip movement while paused
				}

				// 3. Check if in avoidance mode (and pause is finished)
				if (movementState && movementState.avoidanceTimer > 0) {
					movementState.avoidanceTimer -= deltaTime;
					
					// Move in avoidance direction
					const avoidDir = movementState.avoidanceDirection;
					pos.x += avoidDir.x * moveDist;
					pos.y += avoidDir.y * moveDist;

					continue; // Skip target-directed movement for this frame
				}

				// 4. Perform target-directed movement if not giving up, pausing, or avoiding
				const target = entity.components.moveTarget;
				const dx = target.x - pos.x;
				const dy = target.y - pos.y;
				const dist = Math.sqrt(dx * dx + dy * dy);

				if (dist === 0) { // Already at/near target
					entityManager.removeComponent(entity.id, 'moveTarget');
					entityManager.removeComponent(entity.id, 'movementState');
					continue;
				}

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