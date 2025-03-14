import { Bundle } from 'ecspresso';
import { Application, Container, Graphics, Sprite } from 'pixi.js';
import { randomInt, range } from '@/utils';
import type { ActiveControlMap } from '@/types';

declare global {
	interface Components {
		sprite: Sprite;
		selected: true;
		selectable: true;

		position: {
			x: number;
			y: number;
		};

		clickBounds: {
			x: number;
			y: number;
			width: number;
			height: number;
		};

		ownable: true;
		hovered: true;
		hoverable: true;
		owner: 'player' | 'ai' | 'neutral';
	}
}

export function initializeGameBundle() {
	return new Bundle<Components, Events, Resources>()
		.addSystem('initialize-game')
		.setEventHandlers({
			initializeGame: {
				async handler({ game }, entityManager, resourceManager, eventBus) {
					console.log('Initializing game');

					resourceManager.add('worldContainer', new Container())
					resourceManager.add('activeKeyMap', controlMap())
					const pixi = new Application();

					await pixi.init({
						background: '#1099bb',
						resizeTo: window,
					});

					pixi.ticker.add(ticker => {
						game.update(ticker.deltaMS / 1000);
					});

					const worldContainer = new Container();
					pixi.stage.addChild(worldContainer);
					
					const uiContainer = new Container();
					pixi.stage.addChild(uiContainer);
					
					resourceManager.add('pixi', pixi);
					resourceManager.add('worldContainer', worldContainer);
					resourceManager.add('uiContainer', uiContainer);

					document.body.appendChild(pixi.canvas);

					eventBus.publish('initializeMap');
					// eventBus.publish('initializePlayer');
				},
			},
		})
		.bundle
		.addSystem('initialize-map')
		.setEventHandlers({
			initializeMap: {
				handler(_data, entityManager, resourceManager, _eventBus) {
					const { mapSize } = resourceManager.get('config');
					const worldContainer = resourceManager.get('worldContainer');
					const map = new Container()
						.addChild(
							new Graphics()
								.rect(0, 0, mapSize, mapSize)
								.fill(0x000000)
						);
					
					// spinkle stars about
					range(100).forEach(() => {
						const x = randomInt(mapSize);
						const y = randomInt(mapSize);
						
						map.addChild(
							new Graphics()
								.circle(x, y, randomInt(2, 5))
								.fill(0xFFFFFF)
						);
					});

					range(10).forEach(() => {
						const entity = entityManager.createEntity();
						const edgeBuffer = 100;
						const radius = randomInt(20, 60);
						const x = randomInt(edgeBuffer, mapSize - edgeBuffer);
						const y = randomInt(edgeBuffer, mapSize - edgeBuffer);

						// Create graphics object and render it to texture
						const graphics = new Graphics()
							.circle(0, 0, radius)
							.fill(randomInt(0xFFFFFF));
							
						// Convert graphics to texture and create sprite
						const texture = resourceManager.get('pixi').renderer.generateTexture(graphics);
						const sprite = new Sprite(texture);
						
						// Position the sprite (as graphics was centered at 0,0)
						sprite.x = x;
						sprite.y = y;
						sprite.anchor.set(0.5);
						
						sprite.interactive = true;
						sprite.on('mouseenter', () => {
							sprite.scale.set(1.1);
							document.body.style.cursor = 'pointer';
						});

						sprite.on('mouseleave', () => {
							sprite.scale.set(1);
							document.body.style.cursor = 'default';
						});
						
						map.addChild(sprite);
						entityManager
							.addComponent(entity, 'sprite', sprite)
							.addComponent(entity, 'selectable', true)
							.addComponent(entity, 'position', { x, y })
							.addComponent(entity, 'clickBounds', { x: x - radius, y: y - radius, width: radius * 2, height: radius * 2 })
							.addComponent(entity, 'clickBounds', {
								x: x - radius,
								y: y - radius,
								width: radius * 2,
								height: radius * 2,
							});
					});

					worldContainer.addChild(map);
				},
			},
		})
		.bundle;
}

function controlMap(): ActiveControlMap {
	const controlMap = {
		up: false,
		down: false,
		left: false,
		right: false,
	};

	window.addEventListener('keydown', (event) => {
		switch(event.key) {
			case 'w':
			case 'ArrowUp':
				controlMap.up = true;
				break;
			case 's':
			case 'ArrowDown':
				controlMap.down = true;
				break;
			case 'a':
			case 'ArrowLeft':
				controlMap.left = true;
				break;
			case 'd':
			case 'ArrowRight':
				controlMap.right = true;
				break;
		}
	});

	window.addEventListener('keyup', (event) => {
		switch(event.key) {
			case 'w':
			case 'ArrowUp':
				controlMap.up = false;
				break;
			case 's':
			case 'ArrowDown':
				controlMap.down = false;
				break;
			case 'a':
			case 'ArrowLeft':
				controlMap.left = false;
				break;
			case 'd':
			case 'ArrowRight':
				controlMap.right = false;
				break;
		}
	});

	return controlMap;
}