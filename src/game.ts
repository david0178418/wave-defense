import './styles.css';
import ECSpresso, { Bundle } from 'ecspresso';
import { initializeGameBundle } from '@/bundles/initialize-game.bundle';
import { mapPanningBundle } from '@/bundles/map-panning.bundle';
import type { Components, Events, Resources } from './types';
import { selectionBundle } from './bundles/selection.bundle';
import bootstrapUI from './bootstrap-ui';

const ecs = new ECSpresso<Components, Events, Resources>();

bootstrapUI(ecs);

ecs
	.addResource('config', {
		mapSize: 2000,
		panSpeed: 500,
	})
	.install(
		initializeGameBundle(),
		mapPanningBundle(),
		generatePlanetsBundle(),
		selectionBundle()
	)
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