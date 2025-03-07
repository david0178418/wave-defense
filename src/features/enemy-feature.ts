import { Sprite, Texture } from "pixi.js";
import SimpleECS, { Feature } from "../lib/simple-ecs";
import type { Components, Resources, Events } from "../types";
import { EntityType } from "./entity-type-feature";
import { DamageType } from "./combat-feature";

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

// Define stats for different enemy types
export
interface EnemyStats {
	health: number;
	speed: number;
	damage: number;
	size: number;
	color: number; // PIXI tint color
}

// Enemy type to stats mapping
const ENEMY_STATS: Record<EntityType, EnemyStats> = {
	[EntityType.PLAYER]: { health: 0, speed: 0, damage: 0, size: 0, color: 0 }, // Not used
	[EntityType.ENEMY_BASIC]: {
		health: 3,
		speed: 50,
		damage: 1,
		size: 30,
		color: 0xFF0000, // red
	},
	[EntityType.ENEMY_FAST]: {
		health: 1,
		speed: 100,
		damage: 1,
		size: 20,
		color: 0xFF00FF, // magenta
	},
	[EntityType.ENEMY_TANK]: {
		health: 6,
		speed: 30,
		damage: 2,
		size: 40,
		color: 0x800000, // dark red
	},
	[EntityType.PROJECTILE]: { health: 0, speed: 0, damage: 0, size: 0, color: 0 }, // Not used
};

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
					
					// Choose a random enemy type (biased toward basic enemies for now)
					const randomValue = Math.random();
					let enemyType = EntityType.ENEMY_BASIC;
					
					if (randomValue > 0.85) {
						enemyType = EntityType.ENEMY_TANK;
					} else if (randomValue > 0.65) {
						enemyType = EntityType.ENEMY_FAST;
					}
					
					// Get stats for this enemy type
					const stats = ENEMY_STATS[enemyType] || ENEMY_STATS[EntityType.ENEMY_BASIC];
					
					// Create an enemy sprite
					const sprite = new Sprite({
						texture: Texture.WHITE,
						width: stats.size,
						height: stats.size,
						tint: stats.color,
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
					
					// Add basic components to all enemies
					entityManager
						.addComponent(enemy, 'enemy', true) // Mark as enemy
						.addComponent(enemy, 'sprite', sprite)
						.addComponent(enemy, 'position', { x, y })
						.addComponent(enemy, 'velocity', { x: 0, y: 0 })
						.addComponent(enemy, 'drag', { x: 1, y: 1 })
						.addComponent(enemy, 'maxVelocity', { x: stats.speed * 1.5, y: stats.speed * 1.5 }); // Higher than speed to allow for bursts
					
					// Add entity type component
					entityManager.addComponent(enemy, 'entityType', {
						type: enemyType,
						faction: 'enemy'
					});
					
					// Add health component
					entityManager.addComponent(enemy, 'health', {
						current: stats.health,
						max: stats.health
					});
					
					// Add hitbox component
					entityManager.addComponent(enemy, 'hitbox', {
						width: stats.size,
						height: stats.size,
						offsetX: 0,
						offsetY: 0
					});
					
					// Add damage dealer component for contact damage
					entityManager.addComponent(enemy, 'damageDealer', {
						amount: stats.damage,
						type: DamageType.PHYSICAL
					});
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
				const players = entityManager.getEntitiesWithComponents(['entityType']);
				if (players.length === 0) return; // No player found
				
				// Find the first entity with player type
				const player = players.find(entity => 
					entity.components.entityType && 
					entity.components.entityType.type === EntityType.PLAYER
				);
				
				if (!player || !player.components.position) return;
				
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
						// Get this enemy's speed based on type
						let enemySpeed = 50; // Default
						if (enemy.components.entityType) {
							const stats = ENEMY_STATS[enemy.components.entityType.type];
							if (stats) {
								enemySpeed = stats.speed;
							}
						}
						
						// Set the enemy velocity in the player's direction
						enemy.components.velocity.x = (dirX / length) * enemySpeed;
						enemy.components.velocity.y = (dirY / length) * enemySpeed;
					}
				}
			}
		})
		.install();
} 