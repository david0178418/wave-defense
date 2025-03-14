import type { Container } from "pixi.js";

import type { Application } from "pixi.js";

export type Enum<T extends object> = T[keyof T];

// TODO: Maybe resources and events are fine centralized? Maybe only components
// have the orgnaizational issues...?

declare global {
	 interface Resources {
		pixi: Application;
		activeKeyMap: ActiveControlMap;
		worldContainer: Container;
		uiContainer: Container;
		config: {
			panSpeed: number;
			mapSize: number;
		};
	}

	interface Events {
		initializePlayer: true;
		initializeMap: true;
	}

	interface Components {}
}

export
interface ActiveControlMap {
	up: boolean;
	down: boolean;
	left: boolean;
	right: boolean;
}
