import ECSpresso from 'ecspresso';
import { initializeGameBundle } from '@/bundles/initialize-game.bundle';
import { mapPanningBundle } from '@/bundles/map-panning.bundle';

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
	.install(
		initializeGameBundle(),
		mapPanningBundle(),
	)
	.eventBus
	.publish('initializeGame', { game });
