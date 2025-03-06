import { Application, Sprite, Texture } from "pixi.js";
import SimpleECS from "./lib/simple-ecs";

interface Components {
	acceleration: { x: number; y: number };
	drag: { x: number; y: number };
	frozen: boolean;
	health: { current: number; max: number };
	position: { x: number; y: number };
	sprite: Sprite;
	velocity: { x: number; y: number };
}

interface Events {
	initializeGame: undefined;
}

interface Resources {
	pixi: Application;
}

const game = new SimpleECS<Components, Events, Resources>();

game
	.addResource('pixi', new Application())
	.addSystem({
		label: "apply-velocity",
		with: [
			'position',
			'velocity',
		],
		without: ['frozen'],
		process(entities, deltaTime) {
			for (const entity of entities) {
				entity.components.position.x += entity.components.velocity.x * deltaTime;
				entity.components.position.y += entity.components.velocity.y * deltaTime;
			}
		},
	})
	// Are 'apply-acceleration' and 'apply-velocity' the same system?
	.addSystem({
		label: "apply-acceleration",
		with: [
			'velocity',
			'acceleration',
		],
		without: ['frozen'],
		process(entities, deltaTime) {
			for (const entity of entities) {
				entity.components.velocity.x += entity.components.acceleration.x * deltaTime;
				entity.components.velocity.y += entity.components.acceleration.y * deltaTime;
			}
		},
	})
	.addSystem({
		label: "apply-drag",
		with: [
			'velocity',
			'drag',
		],
		without: ['frozen'],
		process(entities, deltaTime) {
			for (const entity of entities) {
				entity.components.velocity.x *= entity.components.drag.x * deltaTime;
				entity.components.velocity.y *= entity.components.drag.y * deltaTime;
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

					resourceManager.add('pixi', pixi);
					const player = entityManager.createEntity();
					const sprite = new Sprite(Texture.WHITE);
					sprite.width = 100;
					sprite.height = 100;
					pixi.stage.addChild(sprite);
					entityManager.addComponent(player, 'sprite', sprite);
					entityManager.addComponent(player, 'position', { x: 0, y: 0 });
					entityManager.addComponent(player, 'velocity', { x: 0, y: 0 });
					entityManager.addComponent(player, 'acceleration', { x: 1, y: 1 });
					
				},
			},
		},
	});

game.eventBus.publish('initializeGame');