import type { Components, Events, Resources } from "@/types";
import { Bundle } from "ecspresso";

export default
function cleanupBundle() {
	return new Bundle<Components, Events, Resources>()
		// Runs relatively late, after rendering might have happened
		.addSystem('cleanup-graphics')
		.addQuery('graphicsToCleanup', { with: ['toBeRemoved', 'renderContainer'] })
		.setProcess((data, _deltaTime, { entityManager }) => {
			for (const entity of data.graphicsToCleanup) {
				const container = entity.components.renderContainer;
				// Remove from Pixi stage
				container.parent?.removeChild(container);
				// Clean up container resources if necessary (e.g., destroy textures)
				container.destroy({ children: true }); // Destroy container and its children

				// Remove the render component itself so this doesn't run again
				entityManager.removeComponent(entity.id, 'renderContainer');
			}
		})
		.bundle
		// Runs last to ensure all other systems are done with the entity
		.addSystem('cleanup-entities')
		.addQuery('entitiesToCleanup', { with: ['toBeRemoved'] })
		.setProcess((data, _deltaTime, { entityManager }) => {
			for (const entity of data.entitiesToCleanup) {
				// Remove entity from ECS world
				entityManager.removeEntity(entity.id);
			}
		})
		.bundle;
} 