import './styles.css';
import ECSpresso, { Bundle } from 'ecspresso';
import { initializeGameBundle } from '@/bundles/initialize-game.bundle';
import { mapPanningBundle } from '@/bundles/map-panning.bundle';
import { mapInitializationBundle } from '@/bundles/map-initialization.bundle';
import type { Components, Events, Resources } from './types';
import { selectionBundle } from './bundles/selection.bundle';
import { Container, Graphics, Sprite } from 'pixi.js';
import { renderBundle } from './bundles/render.bundle';

const ecs = ECSpresso.create<Components, Events, Resources>()
	.withBundle(initializeGameBundle())
	.withBundle(mapInitializationBundle())
	.withBundle(mapPanningBundle())
	.withBundle(selectionBundle())
	.withBundle(renderBundle())
	.withBundle(
		new Bundle<Components, Events, Resources>()
			.addSystem('base')
			.setEventHandlers({
				initializeBase: {
					handler(_data, ecs) {
						
						createBase(ecs);
					},
				}
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

await ecs.initialize();

ecs.eventBus.publish('startGame');

console.log('creating base');
ecs.eventBus.publish('initializeBase', true);

function createBase(ecs: ECSpresso<Components, Events, Resources>) {
	const entity = ecs.entityManager.createEntity();
	const pixi = ecs.resourceManager.get('pixi');
	const sprite = new Sprite(
		pixi.renderer.generateTexture(
			new Graphics()
				.rect(0, 0, 50, 50)
				.fill(0x000000)
		)
	);
	const container = new Container({
		position: {
			x: 500,
			y: 500,
		},
		isRenderGroup: true,
		children: [sprite],
	});

	sprite.setSize(50, 50);
	sprite.anchor.set(.5, .5);

	container.interactive = true;
	container.cursor = 'pointer';

	// sprite mounting is handled by renderBundle via renderLayer component

	ecs.entityManager.addComponent(entity, 'renderContainer', container);
	ecs.entityManager.addComponent(entity, 'renderLayer', 'foreground');
	ecs.entityManager.addComponent(entity, 'position', { x: sprite.x, y: sprite.y });
	ecs.entityManager.addComponent(entity, 'name', 'Base');
	ecs.entityManager.addComponent(entity, 'selectable', true);
	ecs.entityManager.addComponent(entity, 'clickBounds', {
		x: container.x - 25,
		y: container.y - 25,
		width: 50,
		height: 50,
	});

	return entity;
}
