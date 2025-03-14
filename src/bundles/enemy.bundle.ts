import { Container, Sprite, Texture } from "pixi.js";
import { Bundle  } from "ecspresso";
import { EntityClassification, type ConfigResource, type EntityType } from "../types";
import type { MaxVelocity, Position, Velocity } from "./physics.bundle";
import type { Drag } from "./physics.bundle";
import type { Health } from "./health.bundle";
import type { Hitbox } from "./combat.bundle/combat.bundle.types";
import { type DamageDealer, DamageType } from "./combat.bundle/combat.bundle.types";

interface Components {
	enemy: true;
	entityType: EntityType;
	sprite: Sprite;
	position: Position;
	velocity: Velocity;
	drag: Drag;
	maxVelocity: MaxVelocity;
	health: Health;
	hitbox: Hitbox;
	damageDealer: DamageDealer;
	player: true;
}

interface Resources {
	config: ConfigResource;
	enemyState: EnemyState;
	worldContainer: Container;

}

export
interface EnemyState {
	spawnTimer: number;
	maxEnemies: number;
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
const ENEMY_STATS: Record<EntityClassification, EnemyStats> = {
	[EntityClassification.PLAYER]: { health: 0, speed: 0, damage: 0, size: 0, color: 0 }, // Not used
	[EntityClassification.ENEMY_BASIC]: {
		health: 3,
		speed: 50,
		damage: 1,
		size: 30,
		color: 0xFF0000, // red
	},
	[EntityClassification.ENEMY_FAST]: {
		health: 1,
		speed: 100,
		damage: 1,
		size: 20,
		color: 0xFF00FF, // magenta
	},
	[EntityClassification.ENEMY_TANK]: {
		health: 6,
		speed: 30,
		damage: 2,
		size: 40,
		color: 0x800000, // dark red
	},
	[EntityClassification.PROJECTILE]: { health: 0, speed: 0, damage: 0, size: 0, color: 0 }, // Not used
};

export default
function enemyBundle() {
	return new Bundle<Components, {}, Resources>()
		.addSystem('enemy-spawning')
		.addQuery('basicEnemies', {
			with: ['enemy', 'entityType'],
			without: []
		})
		.addQuery('fastEnemies', {
			with: ['enemy', 'entityType'],
			without: []
		})
		.addQuery('tankEnemies', {
			with: ['enemy', 'entityType'],
			without: []
		})
		.setProcess((queries, deltaTime, entityManager, resourceManager) => {
			// Get the map size to know where enemies can spawn
			const {
				basicEnemies,
				fastEnemies,
				tankEnemies,
			} = queries;
			
			// Filter enemy arrays by type
			const basicEnemyCount = basicEnemies.filter(e => 
				e.components.entityType.type === EntityClassification.ENEMY_BASIC).length;
			const fastEnemyCount = fastEnemies.filter(e => 
				e.components.entityType.type === EntityClassification.ENEMY_FAST).length;
			const tankEnemyCount = tankEnemies.filter(e => 
				e.components.entityType.type === EntityClassification.ENEMY_TANK).length;
			
			// Total enemy count
			const totalEnemies = basicEnemyCount + fastEnemyCount + tankEnemyCount;
			
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
				if (totalEnemies >= enemyState.maxEnemies) return;
				
				// Create a new enemy entity
				const enemy = entityManager.createEntity();
				
				// Choose enemy type based on current distribution
				// More sophisticated logic: prefer types that are underrepresented
				const randomValue = Math.random();
				let enemyType: EntityClassification = EntityClassification.ENEMY_BASIC;
				
				// Adjust probabilities based on current enemy distribution
				const fastEnemyRatio = fastEnemyCount / Math.max(1, totalEnemies);
				const tankEnemyRatio = tankEnemyCount / Math.max(1, totalEnemies);
				
				if (randomValue < 0.3 && fastEnemyRatio < 0.3) {
					enemyType = EntityClassification.ENEMY_FAST;
				} else if (randomValue < 0.5 && tankEnemyRatio < 0.2) {
					enemyType = EntityClassification.ENEMY_TANK;
				}
				
				// Get stats for this enemy type
				const stats = ENEMY_STATS[enemyType] || ENEMY_STATS[EntityClassification.ENEMY_BASIC];
				
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
					.addComponent(enemy.id, 'enemy', true) // Mark as enemy
					.addComponent(enemy.id, 'sprite', sprite)
					.addComponent(enemy.id, 'position', { x, y })
					.addComponent(enemy.id, 'velocity', { x: 0, y: 0 })
					.addComponent(enemy.id, 'drag', { x: 1, y: 1 })
					.addComponent(enemy.id, 'maxVelocity', { x: stats.speed * 1.5, y: stats.speed * 1.5 }); // Higher than speed to allow for bursts
				
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
		})
		.bundle
		.addSystem('enemy-movement')
		.addQuery('enemies', {
			with: ['position', 'velocity', 'enemy']
		})
		.addQuery('players', {
			with: [
				'player',
				'position',
			]
		})
		.setProcess((queries, deltaTime, entityManager, resourceManager) => {
			// Check if we have any enemies
			if (!queries.enemies || queries.enemies.length === 0) return;
			
			// Find the player
			const [player] = queries.players;

			if(!player) return;
			
			const playerPos = player.components.position;
			
			// Make each enemy move toward the player
			for (const enemy of queries.enemies) {
				const enemyPos = enemy.components.position;
				
				// Calculate direction vector from enemy to player
				const dirX = playerPos.x - enemyPos.x;
				const dirY = playerPos.y - enemyPos.y;
				
				// Normalize the direction vector (make its length 1)
				const length = Math.sqrt(dirX * dirX + dirY * dirY);
				
				if (length > 0) {
					// Get this enemy's speed based on type
					let speed = 50; // Default speed
					
					// Get entity type to determine speed
					if (enemy.components.entityType) {
						const enemyType = enemy.components.entityType.type;
						if (ENEMY_STATS[enemyType]) {
							speed = ENEMY_STATS[enemyType].speed;
						}
					}
					
					// Calculate normalized direction and apply speed
					const normX = dirX / length;
					const normY = dirY / length;
					
					// Update enemy velocity
					enemy.components.velocity.x = normX * speed;
					enemy.components.velocity.y = normY * speed;
				}
			}
		})
		.bundle;
} 