import type { Application, Sprite, Container, Text } from "pixi.js";
import type { MovementComponents } from "./features/movement-feature";
import type { PlayerControlComponents, PlayerControlResources } from "./features/player-control-feature";
import type { EnemyComponents, EnemyResources } from "./features/enemy-feature";
import type { CombatComponents, CombatEvents } from "./features/combat-feature";
import type { CollisionComponents, CollisionEvents } from "./features/collision-feature";

export
interface Components extends 
	MovementComponents, 
	PlayerControlComponents,
	EnemyComponents,
	CombatComponents,
	CollisionComponents,
	JunkDrawerOfComponents {
}

export
interface JunkDrawerOfComponents {
	player: true;
	sprite: Sprite;
	entityType: {
		faction: 'player' | 'enemy' | 'neutral';  // Used for determining hostility
		type: EntityType;
	};
}

export const EntityType = {
	PLAYER: 'player',
	ENEMY_BASIC: 'enemy_basic',
	// Future enemy types can be added here
	ENEMY_FAST: 'enemy_fast',
	ENEMY_TANK: 'enemy_tank',
	PROJECTILE: 'projectile',
} as const

export
type EntityType = typeof EntityType[keyof typeof EntityType];

export
interface Events extends 
	CombatEvents,
	CollisionEvents,
	JunkDrawerOfEvents {
}

export
interface JunkDrawerOfEvents {
	initializeGame: undefined;
	initializeMap: undefined;
	initializePlayer: undefined;
	gameOver: undefined;
}

export
interface Resources extends 
	PlayerControlResources,
	EnemyResources,
	JunkDrawerOfResources {
}

export
interface JunkDrawerOfResources {
	pixi: Application;
	worldContainer: Container;
	uiContainer: Container;
	healthText: Text;
	config: {
		mapSize: number;
		deadzonePercentWidth: number;
		deadzonePercentHeight: number;
	};
}
