import { Bundle } from 'ecspresso';
import { Application, Container, Graphics } from 'pixi.js';
import { randomInt } from '@/utils';
import type { ActiveControlMap } from '@/types';

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
				handler(_data, _entityManager, resourceManager, _eventBus) {
					const { mapSize } = resourceManager.get('config');
					const worldContainer = resourceManager.get('worldContainer');
					const map = new Container()
						.addChild(
							new Graphics()
								.rect(0, 0, mapSize, mapSize)
								.fill(0x000000)
						);
					
					// spinkle stars about
					for (let i = 0; i < 100; i++) {
						const x = Math.random() * mapSize;
						const y = Math.random() * mapSize;
						
						map.addChild(
							new Graphics()
								.circle(x, y, 2 + randomInt(3))
								.fill(0xFFFFFF)
						);
					}

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