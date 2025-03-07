import { Application, Sprite, Texture } from "pixi.js";
import SimpleECS from "./lib/simple-ecs";
import movementFeature from "./features/movement-feature";
import playerControlFeature from "./features/player-control-feature";
import type { Components, Events, Resources } from "./types";

const game = new SimpleECS<Components, Events, Resources>();

game.addResource('pixi', new Application());

// Initialize features
movementFeature(game);
playerControlFeature(game);

game
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

					resourceManager.add('pixi', pixi);
					const player = entityManager.createEntity();
					const sprite = new Sprite({
						texture: Texture.WHITE,
						width: 50,
						height: 50,
					});
					pixi.stage.addChild(sprite);
					entityManager
						.addComponent(player, 'player', true)
						.addComponent(player, 'sprite', sprite)
						.addComponent(player, 'position', { x: 0, y: 0 })
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
