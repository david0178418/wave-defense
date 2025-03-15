import { Bundle } from 'ecspresso';
import { Application, Container, Graphics } from 'pixi.js';
import { randomInt, range } from '@/utils';
import type { ActiveControlMap, Components, Events, Resources } from '@/types';
import createPlanet from '@/entities/planet';

export function initializeGameBundle() {
	return new Bundle<Components, Events, Resources>()
		.addSystem('initialize-game')
		.setEventHandlers({
			initializeGame: {
				async handler(_data, ecs) {
					const { resourceManager, eventBus } = ecs;
					console.log('Initializing game');
					const { mapSize } = resourceManager.get('config');
					const worldContainer = new Container();
					const map = new Container();
					const background = new Container({isRenderGroup: true});
					const foreground = new Container({ isRenderGroup: true });

					resourceManager.add('worldContainer', worldContainer);
					resourceManager.add('activeKeyMap', controlMap());
					resourceManager.add('background', background);
					resourceManager.add('foreground', foreground);
					resourceManager.add('mapContainer', map);

					background.addChild(
						new Graphics()
							.rect(0, 0, mapSize, mapSize)
							.fill(0x000000)
					);

					map.addChild(background, foreground)
					worldContainer.addChild(map);
					const pixi = new Application();


					await pixi.init({
						background: '#1099bb',
						resizeTo: window,
					});

					pixi.ticker.add(ticker => {
						ecs.update(ticker.deltaMS / 1000);
					});
					
					pixi.stage.addChild(worldContainer);
					
					const uiContainer = new Container();
					pixi.stage.addChild(uiContainer);
					
					resourceManager.add('pixi', pixi);
					resourceManager.add('worldContainer', worldContainer);
					resourceManager.add('uiContainer', uiContainer);

					const canvasContainerEl = document.createElement('div');
					canvasContainerEl.id = 'canvas-container';
					canvasContainerEl.appendChild(pixi.canvas);
					document.body.appendChild(canvasContainerEl);

					eventBus.publish('initializeMap');
					eventBus.publish('initializePlayer');
				},
			},
		})
		.bundle
		.addSystem('initialize-map')
		.setEventHandlers({
			initializeMap: {
				handler(_data, ecs) {
					const { resourceManager } = ecs;
					const { mapSize } = resourceManager.get('config');
					const background = resourceManager.get('background'); // Retrieve background from resourceManager

					// sprinkle stars about
					range(100).forEach(() => {
						const x = randomInt(mapSize);
						const y = randomInt(mapSize);
						
						background.addChild(
							new Graphics()
								.circle(x, y, randomInt(2, 5))
								.fill(0xFFFFFF)
						);
					});

					const edgeBuffer = 100;
					range(10).forEach(() => {

						createPlanet(
							randomInt(edgeBuffer, mapSize - edgeBuffer), 
							randomInt(edgeBuffer, mapSize - edgeBuffer),
							randomInt(20, 60),
							randomInt(0xFFFFFF),
							ecs,
						);
					});
				},
			},
		})
		.bundle
		.addSystem('populate-world')
		.setEventHandlers({
			populateWorld: {
				handler(_data, {entityManager, resourceManager, eventBus}) {
				}
			}
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