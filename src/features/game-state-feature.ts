import { Application, Sprite, Texture, Container, Graphics, Text } from "pixi.js";
import SimpleECS, { Feature } from "../lib/simple-ecs";
import type { Components, Resources, Events } from "../types";
import type EntityManager from "../lib/simple-ecs/entity-manager";
import type ResourceManager from "../lib/simple-ecs/resource-manager";
import type EventBus from "../lib/simple-ecs/event-bus";

export
interface GameStateComponents {
	// No specific components, primarily uses resources and events
}

export default
function gameStateFeature(game: SimpleECS<Components, Events, Resources>) {
	return new Feature<Components, Events, Resources>(game)
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
		})
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
			}
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
		.install();
} 