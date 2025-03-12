export
interface EntityType {
	faction: 'player' | 'enemy' | 'neutral';  // Used for determining hostility
	type: EntityClassification;
}

export
const EntityClassification = {
	PLAYER: 'player',
	ENEMY_BASIC: 'enemy_basic',
	// Future enemy types can be added here
	ENEMY_FAST: 'enemy_fast',
	ENEMY_TANK: 'enemy_tank',
	PROJECTILE: 'projectile',
} as const

export
type EntityClassification = Enum<typeof EntityClassification>;

export type initializeMap = {};
export type initializePlayer = {};
export type GameOver = {};

export
interface ConfigResource {
	mapSize: number;
	deadzonePercentWidth: number;
	deadzonePercentHeight: number;
}

export
type Enum<T extends object> = T[keyof T];
