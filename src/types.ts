import type ECSpresso from "ecspresso";
import type { Entity } from "ecspresso";
import type { Application, Container, Graphics, Sprite } from "pixi.js";

export type Enum<T extends object> = T[keyof T];

// TODO: Maybe resources and events are fine centralized? Maybe only components
// have the orgnaizational issues...?

export
type Game = ECSpresso<Components, Events, Resources>;

export
interface Components {
	hoverable: true;
	hovered: true;
	name: string;
	ownable: true;
	owner: 'player' | 'ai' | 'neutral';
	selectable: true;
	sprite: Sprite;

	clickBounds: {
		x: number;
		y: number;
		width: number;
		height: number;
	};

	position: {
		x: number;
		y: number;
	};

	selected: {
		graphic: Graphics;
	};
}

export
interface Events {
	initializePlayer: true;
	initializeMap: true;
	populateWorld: true;
	initializeGame: true;
	selectEntity: {
		entity: Entity<Components>;
		sprite: Sprite;
	};
	deselectEntity: {
		entity: Entity<Components>;
		sprite: Sprite;
		selectedGraphic: Graphics;
	};
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
		mapSize: {
			width: number;
			height: number;
		};
	};
}

export
interface ActiveControlMap {
	up: boolean;
	down: boolean;
	left: boolean;
	right: boolean;
}
