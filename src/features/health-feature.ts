import SimpleECS, { Feature, createSystem } from "../lib/simple-ecs";
import type { Components, Resources, Events } from "../types";

export
interface HealthComponents {
	health: { current: number; max: number };
	invincible: { timer: number; duration: number };
}

export default
function healthFeature(game: SimpleECS<Components, Events, Resources>) {
	return new Feature<Components, Events, Resources>(game)
		.addSystem(
			createSystem<Components>('player-enemy-collision')
				.addQuery('players', {
					with: ['player', 'position', 'sprite', 'health'] as const
				})
				.addQuery('enemies', {
					with: ['enemy', 'position', 'sprite'] as const
				})
				.setProcess((queries, deltaTime, entityManager, resourceManager, eventBus) => {
					const {
						players,
						enemies,
					} = queries;
					// We only care about the player entity
					const [player] = players;

					if (!player) return;
					
					// TODO Maybe replace with events?
					// Skip collision detection if player is invincible
					if (player.components.invincible) {
						// Update invincibility timer
						player.components.invincible.timer += deltaTime;
						
						// If invincibility period is over, remove the component
						if (player.components.invincible.timer >= player.components.invincible.duration) {
							entityManager.removeComponent(player.id, 'invincible');
							// Restore full opacity
							player.components.sprite.alpha = 1.0;
						}
						return;
					}
					
					// Get all enemies
					if (enemies.length === 0) return;
					
					// Player properties
					const playerPos = player.components.position;
					const playerSprite = player.components.sprite;
					const playerHalfWidth = playerSprite.width / 2;
					const playerHalfHeight = playerSprite.height / 2;
					
					// Check collision with each enemy
					for (const enemy of enemies) {
						const enemyPos = enemy.components.position;
						const enemySprite = enemy.components.sprite;
						const enemyHalfWidth = enemySprite.width / 2;
						const enemyHalfHeight = enemySprite.height / 2;
						
						// Simple AABB (Axis-Aligned Bounding Box) collision detection
						const collisionX = Math.abs(playerPos.x - enemyPos.x) < (playerHalfWidth + enemyHalfWidth);
						const collisionY = Math.abs(playerPos.y - enemyPos.y) < (playerHalfHeight + enemyHalfHeight);
						
						// If collision on both axes, we have a hit
						if (collisionX && collisionY) {
							// Player takes damage (1 damage per enemy hit)
							player.components.health.current -= 1;
							
							// Add invincibility component
							entityManager.addComponent(player.id, 'invincible', {
								timer: 0,
								duration: 0.5 // 0.5 seconds of invincibility
							});
							
							// Set player opacity to 50% during invincibility
							player.components.sprite.alpha = 0.5;
							
							// No need to check other enemies since player is now invincible
							break;
						}
					}
					
					// Check if player health reached zero
					if (player.components.health.current <= 0) {
						// Trigger game over event
						eventBus.publish('gameOver');
					}
				})
				.build()
		)
		.addSystem(
			createSystem<Components>('update-health-display')
				.addQuery('player', {
					with: ['player', 'health'] as const
				})
				.setProcess((queries, deltaTime, entityManager, resourceManager) => {
					// We only care about the player entity
					if (!queries.player || queries.player.length === 0) return;
					const player = queries.player[0];
					if (!player) return;
					
					// Get the health text element
					const healthText = resourceManager.get('healthText');
					if (!healthText) return;
					
					// Update the health text
					const health = player.components.health;
					healthText.text = `Health: ${health.current}/${health.max}`;
				})
				.build()
		)
		.addSystem(
			createSystem<Components>('map-collision')
				.addQuery('entities', {
					with: ['position', 'velocity', 'sprite'] as const
				})
				.setProcess((queries, deltaTime, entityManager, resourceManager) => {
					if (!queries.entities || queries.entities.length === 0) return;
					
					const mapSize = resourceManager.get('config').mapSize;
					const borderWidth = 10;
					
					for (const entity of queries.entities) {
						const position = entity.components.position;
						const sprite = entity.components.sprite;
						const halfWidth = sprite.width / 2;
						const halfHeight = sprite.height / 2;
						
						// Check left boundary
						if (position.x - halfWidth < borderWidth) {
							position.x = borderWidth + halfWidth;
							entity.components.velocity.x = 0;
						}
						
						// Check right boundary
						if (position.x + halfWidth > mapSize - borderWidth) {
							position.x = mapSize - borderWidth - halfWidth;
							entity.components.velocity.x = 0;
						}
						
						// Check top boundary
						if (position.y - halfHeight < borderWidth) {
							position.y = borderWidth + halfHeight;
							entity.components.velocity.y = 0;
						}
						
						// Check bottom boundary
						if (position.y + halfHeight > mapSize - borderWidth) {
							position.y = mapSize - borderWidth - halfHeight;
							entity.components.velocity.y = 0;
						}
					}
				})
				.build()
		)
		.install();
} 