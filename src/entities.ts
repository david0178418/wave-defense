import type ECSpresso from "ecspresso";
import type { Components, Events, Resources, Vector2D, Weapon } from "./types";
import { Container, Graphics, Sprite } from "pixi.js";

// Helper to create simple projectile graphics
function createProjectileGraphic(color: number, radius: number = 4): Graphics {
	return new Graphics()
		.circle(0, 0, radius)
		.fill(color);
}

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
	ecs.entityManager.addComponent(entity, 'playerUnitTag', true);
	ecs.entityManager.addComponent(entity, 'speed', 150);

	const weapon1: Weapon = { // Standard weapon
		range: 200,
		attackSpeed: 1.5,
		cooldownTimer: 0,
		projectileDamage: 5,
		projectileGraphicFn: () => createProjectileGraphic(0xFFFF00) // Yellow
	};
	const weapon2: Weapon = { // Machine gun
		range: 180, // Slightly shorter range
		attackSpeed: 6, // Much faster
		cooldownTimer: 0.1, // Slight initial delay staggers shots
		projectileDamage: 1, // Lower damage
		projectileGraphicFn: () => createProjectileGraphic(0xFF8C00, 3) // Orange, slightly smaller
	};

	ecs.entityManager.addComponent(entity, 'weaponSlots', { slots: [
		weapon1,
		weapon2,
	] });

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
	ecs.entityManager.addComponent(entity, 'health', { current: 25, max: 25 });
	ecs.entityManager.addComponent(entity, 'dealsDamageOnCollision', {
		amount: 5,
		targetTags: ['baseTag'],
		destroySelf: true
	});

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
	ecs.entityManager.addComponent(entity, 'collisionBody', { radius: 75 });
	ecs.entityManager.addComponent(entity, 'health', { current: 100, max: 100 });
	ecs.entityManager.addComponent(entity, 'baseTag', true);
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

export
function createProjectile(
	spawnPos: Vector2D, 
	velocity: Vector2D, 
	damage: number, 
	projectileGraphic: Graphics, // Accept Graphics object
	ecs: ECSpresso<Components, Events, Resources>
) {
	const entity = ecs.entityManager.createEntity();
	
	// Use the passed graphic as the sprite
	const sprite = new Sprite(ecs.resourceManager.get('pixi').renderer.generateTexture(projectileGraphic));
	// Use graphic bounds for collision radius if possible, otherwise default
	const radius = Math.max(projectileGraphic.width / 2, projectileGraphic.height / 2) || 4;

	const container = new Container({
		position: { ...spawnPos },
		isRenderGroup: true,
		children: [sprite],
	});
	sprite.anchor.set(.5, .5);

	ecs.entityManager.addComponent(entity, 'renderContainer', container);
	ecs.entityManager.addComponent(entity, 'renderLayer', 'foreground');
	ecs.entityManager.addComponent(entity, 'position', { ...spawnPos });
	ecs.entityManager.addComponent(entity, 'velocity', { ...velocity });
	ecs.entityManager.addComponent(entity, 'collisionBody', { radius });
	ecs.entityManager.addComponent(entity, 'projectile', true);
	ecs.entityManager.addComponent(entity, 'dealsDamageOnCollision', {
		amount: damage,
		targetTags: ['enemyUnit'],
		destroySelf: true
	});

	return entity;
}
