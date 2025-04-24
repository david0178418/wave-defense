import type { Components, Events, Resources } from "@/types";
import { Bundle } from "ecspresso";

export default
function healthBundle() {
	return new Bundle<Components, Events, Resources>()
		.addSystem('check-health')
		// Query entities with health but not already marked for removal
		.addQuery('livingEntities', { with: ['health'], without: ['toBeRemoved'] })
		.setProcess((data, _deltaTime, { entityManager }) => {
			for (const entity of data.livingEntities) {
				if (entity.components.health.current <= 0) {
					// Mark for removal
					entityManager.addComponent(entity.id, 'toBeRemoved', true);
				}
			}
		})
		.bundle;
} 