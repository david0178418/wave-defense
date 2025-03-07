import type { Application, Sprite, Container, Text } from "pixi.js";
import type { MovementComponents } from "./features/movement-feature";
import type { PlayerControlComponents, PlayerControlResources } from "./features/player-control-feature";

export
interface Components extends MovementComponents, PlayerControlComponents {
	player: true;
	enemy: true;
	health: { current: number; max: number };
	sprite: Sprite;
	invincible: { timer: number; duration: number };
}

export
interface Events {
	initializeGame: undefined;
	initializeMap: undefined;
	initializePlayer: undefined;
	gameOver: undefined;
}

export
interface Resources extends PlayerControlResources {
	pixi: Application;
	worldContainer: Container;
	uiContainer: Container;
	healthText: Text;
	config: {
		mapSize: number;
		deadzonePercentWidth: number;
		deadzonePercentHeight: number;
	};
	enemyState: {
		spawnTimer: number;
		maxEnemies: number;
	};
}

export
interface ActiveControlMap {
	up: boolean;
	down: boolean;
	left: boolean;
	right: boolean;
}
