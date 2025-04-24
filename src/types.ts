import type ECSpresso from "ecspresso";
import type { Entity } from "ecspresso";
import type { Application, Container, Graphics } from "pixi.js";

export type Enum<T extends object> = T[keyof T];

// TODO: Maybe resources and events are fine centralized? Maybe only components
// have the orgnaizational issues...?

export
type Game = ECSpresso<Components, Events, Resources>;

export
interface Vector2D {
	x: number;
	y: number;
}

interface Spawner {
	spawnCost: number;
	elapsedCost: number;
	spawnCallback(): void;
}

// Define tags used for collision targeting
export type CollisionTargetTag = 'baseTag' | 'playerUnitTag' | 'enemyUnit'; // Export the type

export
interface Components {
	hoverable: true;
	hovered: true;
	name: string;
	ownable: true;
	owner: 'player' | 'ai' | 'neutral';
	selectable: true;
	renderContainer: Container;
	enemyUnit?: true;
	playerUnitTag?: true; // Add tag for player units
	baseTag?: true; // Add tag for the base

	shooter?: { // Added for units that shoot
		range: number;
		attackSpeed: number; // Attacks per second
		cooldownTimer: number; // Time until next shot
		projectileDamage: number;
	};

	velocity?: { // Added for projectiles
		x: number;
		y: number;
	};

	projectile?: true; // Tag for projectile entities

	speed: number;

	moveable: true;

	moveTarget: Vector2D;

	waypoints: Vector2D[];

	position: Vector2D;

	collisionBody: {
		// Define shape, e.g., radius for a circle
		radius: number;
		// Potentially add type: 'circle' | 'rectangle' in the future
	};

	movementState?: {
		collisionPauseTimer: number; // Time remaining in pause before avoidance
		avoidanceTimer: number; // Time remaining for orthogonal avoidance move
		avoidanceDirection: Vector2D; // Direction for avoidance move
		collisionRetryCount: number; // Number of consecutive collisions/avoidance maneuvers
	};

	health?: { // Optional, not everything has health
		current: number;
		max: number;
	};

	dealsDamageOnCollision?: {
		amount: number;
		targetTags: CollisionTargetTag[]; // Specify which tags this entity damages
		destroySelf: boolean; // Does this entity get destroyed after dealing damage?
	};

	toBeRemoved?: true; // Flag for entity removal

	selected: {
		graphic: Graphics;
	};

	// Which display layer the sprite should be added to
	renderLayer: 'background' | 'foreground' | 'uiContainer' | 'mapContainer' | 'worldContainer';

	// Spawn
	activeSpawner: Spawner;

	spawnQueue: Spawner[];

	rallyPoint: Vector2D;
}

export
interface Events {
	// Init
	initializePlayer: true;
	initializeMap: true;
	initializeBase: true;
	initializePlayerUnits: {
		position: {
			x: number;
			y: number;
		};
	};
	startGame: true;

	// Controls
	setMoveTarget: {
		entity: Entity<Components>;
		moveTarget: {
			x: number;
			y: number;
		};
		queue?: boolean;
	};
	selectEntity: {
		entity: Entity<Components>;
		renderContainer: Container;
	};
	deselectEntity: {
		entity: Entity<Components>;
		renderContainer: Container;
		selectedGraphic: Graphics;
	};

	mouseLeftClick: {
		point: Vector2D;
	}

	mouseRightClick: {
		point: Vector2D;
	}
}

export
interface Resources {
	uiContainer: Container;
	worldContainer: Container;
	background: Container;
	foreground: Container;
	mapContainer: Container;
	activeKeyMap: ActiveControlMap;
	pixi: Application;
	config: {
		panSpeed: number;
		screenSize: {
			width: number;
			height: number;
		};
		mapSize: {
			width: number;
			height: number;
		};
	};
	enemySpawnConfig: {
		timer: number;
		interval: number;
		targetPosition: Vector2D;
	};
}

export
interface ActiveControlMap {
	up: boolean;
	down: boolean;
	left: boolean;
	right: boolean;
	shift: boolean;
	control: boolean; // TODO: Maybe rename to multiSelect?
}
