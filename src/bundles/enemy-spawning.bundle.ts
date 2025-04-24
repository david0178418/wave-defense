import type { Components, Events, Resources } from "@/types";
import { Bundle } from "ecspresso";
import { createEnemyUnit } from "@/entities";
import { randomInt } from "@/utils";

const SPAWN_EDGE_BUFFER = 50; // How far off-screen to spawn enemies

export default
function enemySpawningBundle() {
	return new Bundle<Components, Events, Resources>()
		.addSystem('spawn-enemies-over-time')
		.setProcess((_data, deltaTime, ecs) => {
			const { resourceManager, entityManager } = ecs;
			const spawnConfig = resourceManager.get('enemySpawnConfig');
			const config = resourceManager.get('config');

			spawnConfig.timer -= deltaTime;

			if (spawnConfig.timer <= 0) {
				// Reset timer
				spawnConfig.timer += spawnConfig.interval;

				// Calculate spawn position
				const mapWidth = config.mapSize.width;
				const mapHeight = config.mapSize.height;
				let spawnX = 0;
				let spawnY = 0;
				const side = randomInt(0, 3); // 0: top, 1: right, 2: bottom, 3: left

				switch (side) {
					case 0: // Top edge
						spawnX = randomInt(0, mapWidth);
						spawnY = -SPAWN_EDGE_BUFFER;
						break;
					case 1: // Right edge
						spawnX = mapWidth + SPAWN_EDGE_BUFFER;
						spawnY = randomInt(0, mapHeight);
						break;
					case 2: // Bottom edge
						spawnX = randomInt(0, mapWidth);
						spawnY = mapHeight + SPAWN_EDGE_BUFFER;
						break;
					case 3: // Left edge
						spawnX = -SPAWN_EDGE_BUFFER;
						spawnY = randomInt(0, mapHeight);
						break;
				}
				
				// Create enemy, passing the full ecs instance
				const enemy = createEnemyUnit({ x: spawnX, y: spawnY }, ecs);
				
				// Set move target
				entityManager.addComponent(enemy, 'moveTarget', { ...spawnConfig.targetPosition });
			}
		})
		.bundle;
} 