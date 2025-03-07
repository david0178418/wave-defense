import type { Application, Sprite, Container, Text } from "pixi.js";
import type { MovementComponents } from "./features/movement-feature";
import type { PlayerControlComponents, PlayerControlResources } from "./features/player-control-feature";
import type { EnemyComponents, EnemyResources } from "./features/enemy-feature";
import type { EntityTypeComponents } from "./features/entity-type-feature";
import type { CombatComponents, CombatEvents } from "./features/combat-feature";
import type { CollisionComponents, CollisionEvents } from "./features/collision-feature";

export
interface Components extends 
	MovementComponents, 
	PlayerControlComponents,
	EnemyComponents,
	EntityTypeComponents,
	CombatComponents,
	CollisionComponents {
	player: true;
	sprite: Sprite;
}

export
interface Events extends 
	CombatEvents,
	CollisionEvents {
	initializeGame: undefined;
	initializeMap: undefined;
	initializePlayer: undefined;
	gameOver: undefined;
}

export
interface Resources extends 
	PlayerControlResources,
	EnemyResources {
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

export
interface ActiveControlMap {
	up: boolean;
	down: boolean;
	left: boolean;
	right: boolean;
}
