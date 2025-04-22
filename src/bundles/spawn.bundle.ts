
import { Bundle } from 'ecspresso';
import type { Components, Events, Resources } from '../types';

export default
function spawnBundle() {
	return new Bundle<Components, Events, Resources>()
		.addSystem('spawn')
		.addQuery('spawningEntities', {
			with: ['activeSpawner', 'position'],
		})
		.setProcess((data, deltaTime, { entityManager }) => {
			for (const entity of data.spawningEntities) {
				const spawner = entity.components.activeSpawner;
				spawner.elapsedCost += deltaTime;

				if (spawner.elapsedCost >= spawner.spawnCost) {
					entityManager.removeComponent(entity, 'activeSpawner');
					spawner.spawnCallback();
				}
			}
		})
		.bundle
		.addSystem('manage-spawn-queue')
		.addQuery('idleSpawners', {
			with: ['spawnQueue', 'position'],
			without: ['activeSpawner'],
		})
		.setProcess((data, deltaTime, { entityManager }) => {
			for (const entity of data.idleSpawners) {
				const nextSpawner = entity.components.spawnQueue.shift();
				if(!nextSpawner) {
					continue;
				}

				entityManager.addComponent(entity, 'activeSpawner', nextSpawner);
			}
		})
		.bundle;
}
