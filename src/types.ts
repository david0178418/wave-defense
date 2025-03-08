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
	CollisionComponents,
	JunkDrawerOfComponents {
}

export
interface JunkDrawerOfComponents {
	player: true;
	sprite: Sprite;
}

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
