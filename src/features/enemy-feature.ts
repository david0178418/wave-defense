import { Sprite, Texture } from "pixi.js";
import SimpleECS, { Feature } from "../lib/simple-ecs";
import type { Components, Resources, Events } from "../types";

export
interface EnemyComponents {
	enemy: true;
}

export
interface EnemyResources {
	enemyState: {
		spawnTimer: number;
		maxEnemies: number;
	};
}

export default
function enemyFeature(game: SimpleECS<Components, Events, Resources>) {
	return new Feature<Components, Events, Resources>(game)
		.addSystem({
			label: "enemy-spawning",
			process(entities, deltaTime, entityManager, resourceManager) {
				// Get the map size to know where enemies can spawn
				const mapSize = resourceManager.get('config').mapSize;
				const borderWidth = 10;
				const worldContainer = resourceManager.get('worldContainer');
				
				// Initialize enemy state if needed
				if (!resourceManager.has('enemyState')) {
					resourceManager.add('enemyState', {
						spawnTimer: 0,
						maxEnemies: 10 // Maximum number of enemies allowed at once
					});
				}
				
				// Get enemy state from resources
				const enemyState = resourceManager.get('enemyState');
				
				// Increment the timer
				enemyState.spawnTimer += deltaTime;
				
				// Spawn an enemy every 3 seconds if below max
				if (enemyState.spawnTimer >= 3) {
					enemyState.spawnTimer = 0;
					
					// Count current enemies to enforce the limit
					const enemies = entityManager.getEntitiesWithComponents(['enemy']);
					if (enemies.length >= enemyState.maxEnemies) return;
					
					// Create a new enemy entity
					const enemy = entityManager.createEntity();
					
					// Create an enemy sprite (red square)
					const sprite = new Sprite({
						texture: Texture.WHITE,
						width: 30,
						height: 30,
						tint: 0xFF0000, // Red color
					});
					
					// Set the anchor point to the center of the sprite
					sprite.anchor.set(0.5, 0.5);
					worldContainer.addChild(sprite);
					
					// Random position along the edges of the map (with some spacing from borders)
					let x = 0;
					let y = 0;
					const safeZone = borderWidth + 50;
					
					// Randomly choose which edge to spawn on
					const edge = Math.floor(Math.random() * 4);
					
					switch (edge) {
						case 0: // Top edge
							x = safeZone + Math.random() * (mapSize - 2 * safeZone);
							y = safeZone;
							break;
						case 1: // Right edge
							x = mapSize - safeZone;
							y = safeZone + Math.random() * (mapSize - 2 * safeZone);
							break;
						case 2: // Bottom edge
							x = safeZone + Math.random() * (mapSize - 2 * safeZone);
							y = mapSize - safeZone;
							break;
						case 3: // Left edge
							x = safeZone;
							y = safeZone + Math.random() * (mapSize - 2 * safeZone);
							break;
					}
					
					// Add components to the enemy
					entityManager
						.addComponent(enemy, 'enemy', true) // Mark as enemy
						.addComponent(enemy, 'sprite', sprite)
						.addComponent(enemy, 'position', { x, y })
						.addComponent(enemy, 'velocity', { x: 0, y: 0 })
						.addComponent(enemy, 'drag', { x: 1, y: 1 })
						.addComponent(enemy, 'maxVelocity', { x: 80, y: 80 }); // Slower than player
				}
			}
		})
		.addSystem({
			label: "enemy-movement",
			with: [
				'position',
				'velocity',
				'enemy'
			],
			process(entities, deltaTime, entityManager, resourceManager) {
				// Find the player
				const players = entityManager.getEntitiesWithComponents(['player', 'position']);
				if (players.length === 0) return; // No player found
				
				// Since we've verified the array is not empty, we know player exists
				// TypeScript needs a non-null assertion to recognize this
				const player = players[0]!;
				const playerPos = player.components.position;
				
				// Make each enemy move toward the player
				for (const enemy of entities) {
					const enemyPos = enemy.components.position;
					
					// Calculate direction vector from enemy to player
					const dirX = playerPos.x - enemyPos.x;
					const dirY = playerPos.y - enemyPos.y;
					
					// Normalize the direction vector (make its length 1)
					const length = Math.sqrt(dirX * dirX + dirY * dirY);
					
					if (length > 0) {
						// Set the enemy velocity in the player's direction
						const enemySpeed = 50; // Base movement speed
						enemy.components.velocity.x = (dirX / length) * enemySpeed;
						enemy.components.velocity.y = (dirY / length) * enemySpeed;
					}
				}
			}
		})
		.install();
} 