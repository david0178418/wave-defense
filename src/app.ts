import ECSpresso, { Bundle } from 'ecspresso';
import { randomInt } from './utils';
import {
	Application,
	Container,
	Graphics,
} from 'pixi.js';

interface Resources {
	pixi: Application;
	activeKeyMap: ActiveControlMap;
	worldContainer: Container;
	uiContainer: Container;
	config: {
		panSpeed: number;
		mapSize: number;
	};
}

interface Events {
	initializePlayer: true;
	initializeMap: true;
	initializeGame: {
		game: typeof game;
	};
}

const game = new ECSpresso<{}, Events, Resources>();

game
	.addResource('config', {
		mapSize: 2000,
		panSpeed: 500,
	})
	.addResource('worldContainer', new Container())
	.addResource('activeKeyMap', controlMap())
	.install(
		initializeGameBundle(),
		mapPanningBundle(),
	)
	.eventBus
	.publish('initializeGame', { game });

function mapPanningBundle() {
	return new Bundle<{}, Events, Resources>()
		.addSystem('map-panning')
		.setProcess((_data, _deltaTime, _entityManager, resourceManager, _eventBus) => {
			const worldContainer = resourceManager.get('worldContainer');
			const keyMap = resourceManager.get('activeKeyMap');
			const pixi = resourceManager.get('pixi');
			const {
				mapSize,
				panSpeed,
			} = resourceManager.get('config');
			
			const panAmount = panSpeed * pixi.ticker.deltaMS / 1000;
			
			let worldX = worldContainer.position.x;
			let worldY = worldContainer.position.y;
			
			const viewWidth = pixi.screen.width;
			const viewHeight = pixi.screen.height;
			
			if (keyMap.up) {
				worldY += panAmount;
			}
			if (keyMap.down) {
				worldY -= panAmount;
			}
			if (keyMap.left) {
				worldX += panAmount;
			}
			if (keyMap.right) {
				worldX -= panAmount;
			}
			
			const minX = -(mapSize - viewWidth);
			const minY = -(mapSize - viewHeight);
			const maxX = 0;
			const maxY = 0;
			
			worldX = Math.max(minX, Math.min(maxX, worldX));
			worldY = Math.max(minY, Math.min(maxY, worldY));
			
			worldContainer.position.set(worldX, worldY);
		})
		.bundle;
}

function initializeGameBundle() {
	return new Bundle<{}, Events, Resources>()
		.addSystem('initialize-game')
		.setEventHandlers({
			initializeGame: {
				async handler({ game }, entityManager, resourceManager, eventBus) {
					console.log('Initializing game');
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

interface ActiveControlMap {
	up: boolean;
	down: boolean;
	left: boolean;
	right: boolean;
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