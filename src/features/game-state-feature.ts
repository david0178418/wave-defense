import { Application, Sprite, Texture, Container, Graphics, Text } from "pixi.js";
import { Bundle } from "../lib/simple-ecs";
import type { JunkDrawerOfComponents, JunkDrawerOfEvents } from "../types";
import { EntityType } from "./entity-type-feature";
import { DamageType, type CombatComponents } from "./combat-feature";
import type { CollisionComponents, JunkDrawerOfCollisionComponents } from "./collision-feature";

export
interface GameStateComponents extends
	CollisionComponents,
	CombatComponents,
	JunkDrawerOfCollisionComponents,
	JunkDrawerOfComponents {
	// No specific components, primarily uses resources and events
}

export
interface GameStateEvents extends
	JunkDrawerOfEvents {
}

export default
function gameStateFeature(game: any) {
	const bundle = new Bundle<GameStateComponents, GameStateEvents>();
	
	return bundle
		.addSystem(
			bundle
				.createSystem('initialize-game')
				.setEventHandlers({
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
				})
		)
		.addSystem(
			bundle
				.createSystem('initialize-map')
				.setEventHandlers({
					initializeMap: {
						handler(data, entityManager, resourceManager, eventBus) {
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
				})
		)
		.addSystem(
			bundle
				.createSystem('initialize-player')
				.setEventHandlers({
					initializePlayer: {
						handler(data, entityManager, resourceManager, eventBus) {
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
							
							// Add basic components
							entityManager
								.addComponent(player, 'player', true)
								.addComponent(player, 'sprite', sprite)
								.addComponent(player, 'position', { x: startX, y: startY })
								.addComponent(player, 'velocity', { x: 0, y: 0 })
								.addComponent(player, 'drag', { x: 3, y: 3 })
								.addComponent(player, 'speed', { x: 3000, y: 3000 })
								.addComponent(player, 'maxVelocity', { x: 1500, y: 1500 })
								.addComponent(player, 'acceleration', { x: 1, y: 1 });
							
							// Add new component system components
							
							// Entity type
							entityManager.addComponent(player, 'entityType', {
								type: EntityType.PLAYER,
								faction: 'player'
							});
							
							// Health
							entityManager.addComponent(player, 'health', {
								current: 30,
								max: 30
							});
							
							// Hitbox for collision detection
							entityManager.addComponent(player, 'hitbox', {
								width: 50,
								height: 50,
								offsetX: 0,
								offsetY: 0
							});
							
							// Defense component with basic physical resistance
							entityManager.addComponent(player, 'defense', {
								resistances: {
									[DamageType.PHYSICAL]: 0.1 // 10% resistance to physical damage
								},
								immunities: [],
								invulnerable: false
							});
						},
					},
				})
		)
		.addSystem(
			bundle.createSystem('game-over-handler')
				.addQuery('enemies', {
					with: ['enemy']
				})
				.addQuery('players', {
					with: [
						'player',
						'position',
						'velocity',
						'health',
					],
				})
				.setEventHandlers({
					gameOver: {
						handler(data, entityManager, resourceManager, eventBus) {
							console.log("Game Over! Resetting game...");
							// Get enemies and players from queries
							const enemies = entityManager.getEntitiesWithComponents(['enemy']);
							const players = entityManager.getEntitiesWithComponents(['player', 'position', 'velocity', 'health']);
							
							// Display game over message
							const healthText = resourceManager.get('healthText');
							healthText.text = "GAME OVER - Resetting...";
							
							// Remove all enemies
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
							
							// TODO Move this to event handler
							// Wait a brief moment before resetting the player
							setTimeout(() => {
								// Reset player position to the middle of the map
								const [player] = players;
								if(!player) return;

								const mapSize = resourceManager.get('config').mapSize;
							
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
							
							}, 2000); // 2 second delay before resetting
						},
					},
				})
		)
		.addSystem(
			bundle.createSystem('camera-follow')
				.addQuery('player', {
					with: ['position', 'player']
				})
				.setProcess((queries, deltaTime, entityManager, resourceManager) => {
					if (!queries.player || queries.player.length === 0) return;
					const player = queries.player[0];
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
				})
		)
		.addSystem(
			bundle.createSystem('update-sprite-position')
				.addQuery('sprites', {
					with: ['position', 'sprite'],
					without: ['frozen']
				})
				.setProcess((queries, deltaTime, entityManager, resourceManager) => {
					if (!queries.sprites || queries.sprites.length === 0) return;
					
					for (const entity of queries.sprites) {
						entity.components.sprite.position.set(entity.components.position.x, entity.components.position.y);
					}
				})
		);
} 