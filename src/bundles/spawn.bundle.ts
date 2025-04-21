
import { Bundle } from 'ecspresso';
import type { Components, Events, Resources } from '../types';

export function spawnBundle() {
	return new Bundle<Components, Events, Resources>()
		.addSystem('spawn')
		.addQuery('spawningEntities', {
			with: ['activeSpawner', 'position'],
		})
		.setProcess((data, deltaTime, ecs) => {
			for (const entity of data.spawningEntities) {
				const spawner = entity.components.activeSpawner;
				spawner.elapsedCost += deltaTime;

				if (spawner.elapsedCost >= spawner.spawnCost) {
					spawner.spawnCallback();
				}
			}
		})
		.bundle;
}
