import { Application, Sprite, Texture, Container, Graphics, Text } from "pixi.js";
import SimpleECS from "./lib/simple-ecs";
import movementFeature from "./features/movement-feature";
import playerControlFeature from "./features/player-control-feature";
import type { Components, Events, Resources } from "./types";
import type EntityManager from "./lib/simple-ecs/entity-manager";
import type ResourceManager from "./lib/simple-ecs/resource-manager";
import type EventBus from "./lib/simple-ecs/event-bus";

const game = new SimpleECS<Components, Events, Resources>();

game
	.addResource('config', {
		mapSize: 2000,
		deadzonePercentWidth: 0.2,
		deadzonePercentHeight: 0.2,
	})
	.addResource('pixi', new Application())
	.addResource('worldContainer', new Container());

// Initialize features
movementFeature(game);
playerControlFeature(game);

game
	.addSystem({
		label: "camera-follow",
		with: [
			'position',
			'player',
		],
		process(entities, deltaTime, entityManager, resourceManager) {
			const [player] = entities;
			if (!player) return;
			
			const pixi = resourceManager.get('pixi');
			const worldContainer = resourceManager.get('worldContainer');
			const {
				mapSize,
				deadzonePercentWidth,
				deadzonePercentHeight,
			} = resourceManager.get('config');
			
			
			const deadzoneWidth = pixi.screen.width * deadzonePercentWidth;
			const deadzoneHeight = pixi.screen.height * deadzonePercentHeight;
			
			// Calculate the center of the screen in world coordinates
			const screenCenterX = -worldContainer.position.x + pixi.screen.width / 2;
			const screenCenterY = -worldContainer.position.y + pixi.screen.height / 2;
			
			// Calculate deadzone boundaries
			const deadzoneLeft = screenCenterX - deadzoneWidth / 2;
			const deadzoneRight = screenCenterX + deadzoneWidth / 2;
			const deadzoneTop = screenCenterY - deadzoneHeight / 2;
			const deadzoneBottom = screenCenterY + deadzoneHeight / 2;
			
			// Calculate target camera position (where the camera should eventually be)
			let targetCameraX = worldContainer.position.x;
			let targetCameraY = worldContainer.position.y;
			
			// Check if player is outside deadzone horizontally
			if (player.components.position.x < deadzoneLeft) {
				targetCameraX = pixi.screen.width / 2 - (player.components.position.x + deadzoneWidth / 2);
			} else if (player.components.position.x > deadzoneRight) {
				targetCameraX = pixi.screen.width / 2 - (player.components.position.x - deadzoneWidth / 2);
			}
			
			// Check if player is outside deadzone vertically
			if (player.components.position.y < deadzoneTop) {
				targetCameraY = pixi.screen.height / 2 - (player.components.position.y + deadzoneHeight / 2);
			} else if (player.components.position.y > deadzoneBottom) {
				targetCameraY = pixi.screen.height / 2 - (player.components.position.y - deadzoneHeight / 2);
			}
			
			// Camera smoothing factor - lower values make camera movement more gradual
			// Adjust this value to increase or decrease smoothing (0.05 to 0.15 is usually a good range)
			const smoothFactor = 0.08;
			
			// Apply smoothing using linear interpolation (lerp)
			// The camera moves a percentage of the way toward its target position each frame
			// Multiply by deltaTime to ensure consistent smoothing regardless of frame rate
			const smoothingMultiplier = Math.min(1, smoothFactor * (deltaTime * 60)); // Normalize for 60fps
			
			// Smoothly move camera toward target position
			worldContainer.position.x += (targetCameraX - worldContainer.position.x) * smoothingMultiplier;
			worldContainer.position.y += (targetCameraY - worldContainer.position.y) * smoothingMultiplier;
			
			// Limit camera to map boundaries
			// Calculate the maximum allowed camera positions to prevent showing outside the map
			const minCameraX = -(mapSize - pixi.screen.width);
			const minCameraY = -(mapSize - pixi.screen.height);
			const maxCameraX = 0;
			const maxCameraY = 0;
			
			// Apply camera boundaries
			worldContainer.position.x = Math.max(minCameraX, Math.min(maxCameraX, worldContainer.position.x));
			worldContainer.position.y = Math.max(minCameraY, Math.min(maxCameraY, worldContainer.position.y));
		},
	})
	.addSystem({
		label: "map-collision",
		with: [
			'position',
			'velocity',
			'sprite',
		],
		process(entities, deltaTime, entityManager, resourceManager) {
			const mapSize = 2000;
			const borderWidth = 10;
			
			for (const entity of entities) {
				const position = entity.components.position;
				const sprite = entity.components.sprite;
				const halfWidth = sprite.width / 2;
				const halfHeight = sprite.height / 2;
				
				// Calculate entity boundaries based on its position and sprite dimensions
				// Taking into account that position is at center due to sprite anchor being 0.5Crea
				
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
		},
	})
	.addSystem({
		label: "update-sprite-position",
		with: [
			'position',
			'sprite',
		],
		without: ['frozen'],
		process(entities, deltaTime, entityManager, resourceManager) {
			for (const entity of entities) {
				entity.components.sprite.position.set(entity.components.position.x, entity.components.position.y);
			}
		},
	})
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
	.addSystem({
		label: "player-enemy-collision",
		with: [
			'player',
			'position',
			'sprite',
			'health'
		],
		process(entities, deltaTime, entityManager, resourceManager, eventBus) {
			// We only care about the player entity
			const player = entities[0];
			if (!player) return;
			
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
			const enemies = entityManager.getEntitiesWithComponents(['enemy', 'position', 'sprite']);
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
		}
	})
	.addSystem({
		label: "initialize-game",
		eventHandlers: {
			initializeGame: {
				async handler(data, entityManager, resourceManager, eventBus) {
					const pixi = new Application();

					await pixi.init({
						background: '#1099bb',
						resizeTo: window,
					});

					// Append the application canvas to the document body
					document.body.appendChild(pixi.canvas);

					pixi.ticker.add(ticker => {
						game.update(ticker.deltaMS / 1000);
					});

					// Create a container for the world (for camera movement)
					const worldContainer = new Container();
					pixi.stage.addChild(worldContainer);
					
					// Create UI container (fixed position, not affected by camera)
					const uiContainer = new Container();
					pixi.stage.addChild(uiContainer);
					
					// Create health display text
					const healthText = new Text('Health: 30/30', {
						fontFamily: 'Arial',
						fontSize: 24,
						fill: 0xffffff,
						align: 'left',
					});
					healthText.position.set(20, 20);
					uiContainer.addChild(healthText);
					
					// Update resources
					resourceManager.add('pixi', pixi);
					resourceManager.add('worldContainer', worldContainer);
					resourceManager.add('uiContainer', uiContainer);
					resourceManager.add('healthText', healthText);
					
					// Initialize map and player
					eventBus.publish('initializeMap');
					eventBus.publish('initializePlayer');
				},
			},
		},
	})
	.addSystem({
		label: "initialize-map",
		eventHandlers: {
			initializeMap: {
				handler(data: undefined, entityManager: EntityManager<Components>, resourceManager: ResourceManager<Resources>, eventBus: EventBus<Events>) {
					const worldContainer = resourceManager.get('worldContainer');
					const mapSize = 2000;
					const map = new Container();
					worldContainer.addChild(map);
					
					// Create map background
					const mapBackground = new Graphics();
					mapBackground.beginFill(0x1099bb);
					mapBackground.drawRect(0, 0, mapSize, mapSize);
					mapBackground.endFill();
					map.addChild(mapBackground);
					
					// Create map borders
					const borderWidth = 10;
					const mapBorders = new Graphics();
					mapBorders.beginFill(0x000000);
					
					// Top border
					mapBorders.drawRect(0, 0, mapSize, borderWidth);
					// Bottom border
					mapBorders.drawRect(0, mapSize - borderWidth, mapSize, borderWidth);
					// Left border
					mapBorders.drawRect(0, 0, borderWidth, mapSize);
					// Right border
					mapBorders.drawRect(mapSize - borderWidth, 0, borderWidth, mapSize);
					
					mapBorders.endFill();
					map.addChild(mapBorders);
				},
			},
		},
	})
	.addSystem({
		label: "initialize-player",
		eventHandlers: {
			initializePlayer: {
				handler(data: undefined, entityManager: EntityManager<Components>, resourceManager: ResourceManager<Resources>, eventBus: EventBus<Events>) {
					const worldContainer = resourceManager.get('worldContainer');
					const mapSize = resourceManager.get('config').mapSize;
					
					const player = entityManager.createEntity();
					const sprite = new Sprite({
						texture: Texture.WHITE,
						width: 50,
						height: 50,
					});
					// Set the anchor point to the center of the sprite
					sprite.anchor.set(0.5, 0.5);
					worldContainer.addChild(sprite);
					
					// Place player in the middle of the map initially
					const startX = mapSize / 2;
					const startY = mapSize / 2;
					
					entityManager
						.addComponent(player, 'player', true)
						.addComponent(player, 'sprite', sprite)
						.addComponent(player, 'position', { x: startX, y: startY })
						.addComponent(player, 'velocity', { x: 0, y: 0 })
						.addComponent(player, 'drag', { x: 3, y: 3 })
						.addComponent(player, 'speed', { x: 3000, y: 3000 })
						.addComponent(player, 'maxVelocity', { x: 1500, y: 1500 })
						.addComponent(player, 'acceleration', { x: 1, y: 1 })
						.addComponent(player, 'health', { current: 30, max: 30 });
				},
			},
		},
	})
	.addSystem({
		label: "update-health-display",
		with: [
			'player',
			'health'
		],
		process(entities, deltaTime, entityManager, resourceManager) {
			// We only care about the player entity
			const player = entities[0];
			if (!player) return;
			
			// Get the health text element
			const healthText = resourceManager.get('healthText');
			if (!healthText) return;
			
			// Update the health text
			const health = player.components.health;
			healthText.text = `Health: ${health.current}/${health.max}`;
		}
	})
	.addSystem({
		label: "game-over-handler",
		eventHandlers: {
			gameOver: {
				handler(data: undefined, entityManager: EntityManager<Components>, resourceManager: ResourceManager<Resources>, eventBus: EventBus<Events>) {
					console.log("Game Over! Resetting game...");
					
					// Display game over message
					const healthText = resourceManager.get('healthText');
					healthText.text = "GAME OVER - Resetting...";
					
					// Remove all enemies
					const enemies = entityManager.getEntitiesWithComponents(['enemy']);
					for (const enemy of enemies) {
						// Remove enemy sprite from the scene
						if (enemy.components.sprite) {
							const worldContainer = resourceManager.get('worldContainer');
							worldContainer.removeChild(enemy.components.sprite);
						}
						
						// Remove enemy entity
						entityManager.removeEntity(enemy.id);
					}
					
					// Reset enemy spawning state
					const enemyState = resourceManager.get('enemyState');
					enemyState.spawnTimer = 0;
					
					// Wait a brief moment before resetting the player
					setTimeout(() => {
						// Reset player position to the middle of the map
						const players = entityManager.getEntitiesWithComponents(['player']);
						if (players.length > 0) {
							const player = players[0];
							const mapSize = resourceManager.get('config').mapSize;
							
							// Make sure player has all required components
							if (player && player.components.position && player.components.velocity && player.components.health) {
								// Reset position to center of map
								player.components.position.x = mapSize / 2;
								player.components.position.y = mapSize / 2;
								
								// Reset velocity
								player.components.velocity.x = 0;
								player.components.velocity.y = 0;
								
								// Reset health
								player.components.health.current = player.components.health.max;
								
								// Remove invincibility if present
								if (player.components.invincible) {
									entityManager.removeComponent(player.id, 'invincible');
									if (player.components.sprite) {
										player.components.sprite.alpha = 1.0;
									}
								}
								
								// Update health display
								healthText.text = `Health: ${player.components.health.current}/${player.components.health.max}`;
							}
						}
					}, 2000); // 2 second delay before resetting
				},
			},
		},
	});

game.eventBus.publish('initializeGame');
