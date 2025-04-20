import type ECSpresso from "ecspresso";
import type { Entity } from "ecspresso";
import type { Application, Container, Graphics } from "pixi.js";

export type Enum<T extends object> = T[keyof T];

// TODO: Maybe resources and events are fine centralized? Maybe only components
// have the orgnaizational issues...?

export
type Game = ECSpresso<Components, Events, Resources>;

interface Vector2D {
	x: number;
	y: number;
}

export
interface Components {
	hoverable: true;
	hovered: true;
	name: string;
	ownable: true;
	owner: 'player' | 'ai' | 'neutral';
	selectable: true;
	renderContainer: Container;

	speed: number;

	moveable: true;

	moveTarget: Vector2D;

	waypoints: Vector2D[];

	clickBounds: {
		x: number;
		y: number;
		width: number;
		height: number;
	};

	position: Vector2D;

	selected: {
		graphic: Graphics;
	};

	// Which display layer the sprite should be added to
	renderLayer: 'background' | 'foreground' | 'uiContainer' | 'mapContainer' | 'worldContainer';
}

export
interface Events {
	initializePlayer: true;
	initializeMap: true;
	startGame: true;
	initializeBase: true;
	initializePlayerUnits: {
		position: {
			x: number;
			y: number;
		};
	};
	applyMoveTarget: {
		entity: Entity<Components>;
		moveTarget: {
			x: number;
			y: number;
		};
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
