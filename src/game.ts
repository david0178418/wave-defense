import './styles.css';
import ECSpresso from 'ecspresso';
import { initializeGameBundle } from '@/bundles/initialize-game.bundle';
import { mapPanningBundle } from '@/bundles/map-panning.bundle';
import { mapInitializationBundle } from '@/bundles/map-initialization.bundle';
import type { Components, Events, Resources } from './types';
import { selectionBundle } from './bundles/selection.bundle';

const ecs = ECSpresso.create<Components, Events, Resources>()
	.withBundle(initializeGameBundle())
	.withBundle(mapInitializationBundle())
	.withBundle(mapPanningBundle())
	.withBundle(selectionBundle())
	.build()
	.addResource('config', {
		panSpeed: 500,
		screenSize: {
			width: 1280,
			height: 720,
		},
		mapSize: {
			width: 2000,
			height: 2000,
		},
	})

await ecs.initialize();

ecs.eventBus.publish('startGame');
