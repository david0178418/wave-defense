import './styles.css';
import type { Components, Events, Resources } from './types';
import ECSpresso, { Bundle } from 'ecspresso';
import initializeGameBundle from '@/bundles/initialize-game.bundle';
import mapInitializationBundle from '@/bundles/map-initialization.bundle';
import renderBundle from '@/bundles/render.bundle';
import movementBundle from '@/bundles/movement.bundle';
import spawnBundle from '@/bundles/spawn.bundle';
import controlsBundle from './bundles/controls-bundle.bundle';
import { createBase, createPlayerUnit } from './entities';

const ecs = ECSpresso.create<Components, Events, Resources>()
	.withBundle(initializeGameBundle())
	.withBundle(mapInitializationBundle())
	.withBundle(renderBundle())
	.withBundle(movementBundle())
	.withBundle(spawnBundle())
	.withBundle(controlsBundle())
	.withBundle(
		new Bundle<Components, Events, Resources>()
			.addSystem('spawns')
			.setEventHandlers({
				initializeBase: {
					handler(_data, ecs) {
						createBase(500, 500, ecs);
					},
				},
				initializePlayerUnits: {
					handler({ position }, ecs) {
						createPlayerUnit(position, ecs);
					},
				},
			})
			.bundle
	)
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
	});

await ecs.initialize();
ecs.eventBus.publish('startGame');
ecs.eventBus.publish('initializeBase', true);
ecs.eventBus.publish('initializePlayerUnits', {
	position: {
		x: 300,
		y: 300,
	},
});
