import './styles.css';
import ECSpresso, { Bundle } from 'ecspresso';
import { initializeGameBundle } from '@/bundles/initialize-game.bundle';
import { mapPanningBundle } from '@/bundles/map-panning.bundle';
import type { Components, Events, Resources } from './types';
import { selectionBundle } from './bundles/selection.bundle';

const ecs = ECSpresso.create<Components, Events, Resources>()
	.withBundle(initializeGameBundle())
	.withBundle(mapPanningBundle())
	.withBundle(generatePlanetsBundle())
	.withBundle(selectionBundle())
	.build();

ecs
	.addResource('config', {
		panSpeed: 500,
		mapSize: {
			width: 2000,
			height: 2000,
		},
	})
	.eventBus
	.publish('initializeGame');

function generatePlanetsBundle() {
	return new Bundle<Components, Events, Resources>()
		.addSystem('generate-planets')
		.setProcess((_data, _deltaTime, _ecs) => {
			// Generate planet entities
		})
		.bundle;
}