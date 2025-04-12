import './styles.css';
import ECSpresso from 'ecspresso';
import { initializeGameBundle } from '@/bundles/initialize-game.bundle';
import { mapPanningBundle } from '@/bundles/map-panning.bundle';
import type { Components, Events, Resources } from './types';
import { selectionBundle } from './bundles/selection.bundle';

ECSpresso.create<Components, Events, Resources>()
	.withBundle(initializeGameBundle())
	.withBundle(mapPanningBundle())
	.withBundle(selectionBundle())
	.build()
	.addResource('config', {
		panSpeed: 500,
		mapSize: {
			width: 2000,
			height: 2000,
		},
	})
	.eventBus
	.publish('initializeGame');
