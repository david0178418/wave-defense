import ECSpresso, { Bundle } from 'ecspresso';
import { initializeGameBundle } from '@/bundles/initialize-game.bundle';
import { Container } from 'pixi.js';
import type { ActiveControlMap } from './types';


// Feels gross. Need to find better way to handle this information
declare global {
	interface Events {
		initializeGame: {
			game: typeof game;
		};
	}
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
	return new Bundle<Components, Events, Resources>()
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