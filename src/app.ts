import { Application, Sprite, Texture, Container, Graphics } from "pixi.js";
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
				// Taking into account that position is at center due to sprite anchor being 0.5
				
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
					
					// Update resources
					resourceManager.add('pixi', pixi);
					resourceManager.add('worldContainer', worldContainer);
					
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
						.addComponent(player, 'acceleration', { x: 1, y: 1 });
				},
			},
		},
	});

game.eventBus.publish('initializeGame');
