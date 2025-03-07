import type { Application, Sprite } from "pixi.js";
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
}

export
interface Resources extends PlayerControlResources {
	pixi: Application;
}

export
interface ActiveControlMap {
	up: boolean;
	down: boolean;
	left: boolean;
	right: boolean;
}
