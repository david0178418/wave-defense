import type { Application, Sprite, Container } from "pixi.js";
import type { MovementComponents } from "./features/movement-feature";
import type { PlayerControlComponents, PlayerControlResources } from "./features/player-control-feature";

export
interface Components extends MovementComponents, PlayerControlComponents {
	player: true;
	health: { current: number; max: number };
	sprite: Sprite;
}

export
interface Events {
	initializeGame: undefined;
	initializeMap: undefined;
	initializePlayer: undefined;
}

export
interface Resources extends PlayerControlResources {
	pixi: Application;
	worldContainer: Container;
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
