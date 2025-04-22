import type { Components, Events, Resources } from "@/types";
import { Bundle } from "ecspresso";

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
				const nextWaypoint = entity.components.waypoints.shift();

				if (nextWaypoint) {
					entityManager.addComponent(entity.id, 'moveTarget', nextWaypoint);
				} else {
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
						entityManager.removeComponent(entity.id, 'waypoints');
						entityManager.addComponent(entity, 'moveTarget', moveTarget);
					}
				}
			}
		})
		.bundle
		.addSystem('move-toward-target')
		.addQuery('moveTargetEntities', { with: ['moveTarget', 'position', 'speed'] })
		.setProcess((data, deltaTime, { entityManager }) => {
			for (const entity of data.moveTargetEntities) {
				// Calculate the distance traveled toward the target given the speed and apply it to the position
				const target = entity.components.moveTarget;
				const pos = entity.components.position;
				const speed = entity.components.speed;
				const dx = target.x - pos.x;
				const dy = target.y - pos.y;
				const dist = Math.sqrt(dx * dx + dy * dy);
				if (dist === 0) continue; // Already at target
				const moveDist = speed * deltaTime;
				if (moveDist >= dist) {
					// Overshoot, snap to target
					pos.x = target.x;
					pos.y = target.y;
					entityManager.removeComponent(entity.id, 'moveTarget');
				} else {
					// Move toward target
					const ratio = moveDist / dist;
					pos.x += dx * ratio;
					pos.y += dy * ratio;
				}

				if(dist < 10) {
					entityManager.removeComponent(entity.id, 'moveTarget');
				}
			}
		})
		.bundle
		.addSystem('update-sprite-position')
		.addQuery('updatedSpritePositionEntities', { with: ['renderContainer', 'position', 'moveTarget'] })
		.setProcess((data, deltaTime) => {
			for (const entity of data.updatedSpritePositionEntities) {
				if(
					entity.components.renderContainer.x === entity.components.position.x &&
					entity.components.renderContainer.y === entity.components.position.y
				) {
					return;
				}

				entity.components.renderContainer.x = entity.components.position.x;
				entity.components.renderContainer.y = entity.components.position.y;
			}
		})
		.bundle;
}