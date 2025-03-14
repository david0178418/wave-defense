import ECSpresso, { Bundle } from 'ecspresso';
import { initializeGameBundle } from '@/bundles/initialize-game.bundle';
import { mapPanningBundle } from '@/bundles/map-panning.bundle';

// Feels gross. Need to find better way to handle this information
declare global {
	interface Events {
		initializeGame: {
			game: typeof game;
		};
	}

	interface Resources {
		config: {
			mapSize: number;
			panSpeed: number;
		};
	}
}

const game = new ECSpresso<{}, Events, Resources>();

game
	.addResource('config', {
		mapSize: 2000,
		panSpeed: 500,
	})
	.install(
		initializeGameBundle(),
		mapPanningBundle(),
		generatePlanetsBundle(),
	)
	.eventBus
	.publish('initializeGame', { game });


function generatePlanetsBundle() {
	return new Bundle<Components, Events, Resources>()
		.addSystem('generate-planets')
		.setProcess((_data, _deltaTime, _entityManager, _resourceManager, _eventBus) => {
			// Generate planet entities
		})
		.bundle;
}