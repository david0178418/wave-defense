import './styles.css';
import type { Components, Events, Resources } from './types';
import ECSpresso, { Bundle } from 'ecspresso';
import initializeGameBundle from '@/bundles/initialize-game.bundle';
import mapInitializationBundle from '@/bundles/map-initialization.bundle';
import renderBundle from '@/bundles/render.bundle';
import movementBundle from '@/bundles/movement.bundle';
import spawnBundle from '@/bundles/spawn.bundle';
import controlsBundle from './bundles/controls-bundle.bundle';
import collisionBundle from './bundles/collision.bundle';
import enemySpawningBundle from './bundles/enemy-spawning.bundle';
import healthBundle from './bundles/health.bundle';
import cleanupBundle from './bundles/cleanup.bundle';
import shootingBundle from './bundles/shooting.bundle';
import { createBase, createPlayerUnit } from './entities';

const ecs = ECSpresso.create<Components, Events, Resources>()
	.withBundle(initializeGameBundle())
	.withBundle(mapInitializationBundle())
	.withBundle(controlsBundle())
	.withBundle(enemySpawningBundle())
	.withBundle(spawnBundle())
	.withBundle(shootingBundle())
	.withBundle(collisionBundle())
	.withBundle(movementBundle())
	.withBundle(healthBundle())
	.withBundle(renderBundle())
	.withBundle(cleanupBundle())
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
	})
	.addResource('enemySpawnConfig', {
		timer: 2.0,
		interval: 2.0,
		targetPosition: { x: 500, y: 500 },
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
