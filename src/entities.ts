import type ECSpresso from "ecspresso";
import type { Components, Events, Resources, Vector2D } from "./types";
import { Container, Graphics, Sprite } from "pixi.js";

export
function createPlayerUnit({ x, y }: Vector2D, ecs: ECSpresso<Components, Events, Resources>) {
	const entity = ecs.entityManager.createEntity();
	const pixi = ecs.resourceManager.get('pixi');
	const sprite = new Sprite(
		pixi.renderer.generateTexture(
			new Graphics()
				.rect(0, 0, 25, 25)
				.fill(0x0000FF)
		)
	);
	const container = new Container({
		position: {
			x,
			y,
		},
		isRenderGroup: true,
		children: [sprite],
	});

	// sprite.setSize(25, 25);
	sprite.anchor.set(.5, .5);

	container.interactive = true;
	container.cursor = 'pointer';

	// sprite mounting is handled by renderBundle via renderLayer component

	ecs.entityManager.addComponent(entity, 'renderContainer', container);
	ecs.entityManager.addComponent(entity, 'renderLayer', 'foreground');
	ecs.entityManager.addComponent(entity, 'position', { x, y });
	ecs.entityManager.addComponent(entity, 'collisionBody', { radius: 12.5 });
	ecs.entityManager.addComponent(entity, 'name', 'Player Unit');
	ecs.entityManager.addComponent(entity, 'selectable', true);
	ecs.entityManager.addComponent(entity, 'moveable', true);
	ecs.entityManager.addComponent(entity, 'speed', 150);

	return entity;
}

export
function createEnemyUnit({ x, y }: Vector2D, ecs: ECSpresso<Components, Events, Resources>) {
	const entity = ecs.entityManager.createEntity();
	const pixi = ecs.resourceManager.get('pixi');
	const sprite = new Sprite(
		pixi.renderer.generateTexture(
			new Graphics()
				.rect(0, 0, 25, 25) // Same size for now
				.fill(0xFF0000) // Red color
		)
	);
	const container = new Container({
		position: {
			x,
			y,
		},
		isRenderGroup: true,
		children: [sprite],
	});

	sprite.anchor.set(.5, .5);

	// Don't make enemies interactive for now
	// container.interactive = true;
	// container.cursor = 'pointer';

	ecs.entityManager.addComponent(entity, 'renderContainer', container);
	ecs.entityManager.addComponent(entity, 'renderLayer', 'foreground');
	ecs.entityManager.addComponent(entity, 'position', { x, y });
	ecs.entityManager.addComponent(entity, 'collisionBody', { radius: 12.5 }); // Make them collide
	ecs.entityManager.addComponent(entity, 'name', 'Enemy Unit');
	// ecs.entityManager.addComponent(entity, 'selectable', true); // Not selectable
	ecs.entityManager.addComponent(entity, 'moveable', true);
	ecs.entityManager.addComponent(entity, 'enemyUnit', true); // Mark as enemy
	ecs.entityManager.addComponent(entity, 'speed', 100); // Slightly slower? Adjust as needed

	return entity;
}

export
function createBase(x: number, y: number, ecs: ECSpresso<Components, Events, Resources>) {
	const entity = ecs.entityManager.createEntity();
	const pixi = ecs.resourceManager.get('pixi');
	const sprite = new Sprite(
		pixi.renderer.generateTexture(
			new Graphics()
				.rect(0, 0, 150, 150)
				.fill(0x000000)
		)
	);
	const container = new Container({
		position: {
			x,
			y,
		},
		isRenderGroup: true,
		children: [sprite],
	});

	sprite.anchor.set(.5, .5);
	container.interactive = true;
	container.cursor = 'pointer';

	// sprite mounting is handled by renderBundle via renderLayer component
	ecs.entityManager.addComponent(entity, 'renderContainer', container);
	ecs.entityManager.addComponent(entity, 'renderLayer', 'foreground');
	ecs.entityManager.addComponent(entity, 'position', { x, y });
	ecs.entityManager.addComponent(entity, 'name', 'Base');
	ecs.entityManager.addComponent(entity, 'selectable', true);
	ecs.entityManager.addComponent(entity, 'rallyPoint', {
		x: x + 100,
		y: y + 100,
	});

	ecs.entityManager.addComponent(entity, 'spawnQueue', [
		{
			spawnCost: 2,
			elapsedCost: 0,
			spawnCallback,
		}, {
			spawnCost: 4,
			elapsedCost: 0,
			spawnCallback,
		}, {
			spawnCost: 4,
			elapsedCost: 0,
			spawnCallback,
		}, {
			spawnCost: 4,
			elapsedCost: 0,
			spawnCallback,
		}, {
			spawnCost: 4,
			elapsedCost: 0,
			spawnCallback,
		},
	]);
	
	function spawnCallback() {
		console.log('spawning player unit');
		const rallyPoint = entity.components.rallyPoint;

		if(!rallyPoint) {
			console.error('No rally point.');
			return;
		}

		const newPlayerUnit = createPlayerUnit(container, ecs);

		ecs.entityManager.addComponent(newPlayerUnit, 'moveTarget', {
			...rallyPoint,
		});
	}

	return entity;
}
