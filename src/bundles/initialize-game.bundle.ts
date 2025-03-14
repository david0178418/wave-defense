import { Bundle } from 'ecspresso';
import { Application, Container, Graphics } from 'pixi.js';
import { randomInt } from '@/utils';

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
		game: any; // Using any here to avoid circular reference
	};
}

interface ActiveControlMap {
	up: boolean;
	down: boolean;
	left: boolean;
	right: boolean;
}

export function initializeGameBundle() {
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