import SimpleECS, { Feature } from "../lib/simple-ecs";
import type { Components, Resources, Events } from "../types";

// Define entity types as an enum for better type safety and extensibility
export
enum EntityType {
	PLAYER = 'player',
	ENEMY_BASIC = 'enemy_basic',
	// Future enemy types can be added here
	ENEMY_FAST = 'enemy_fast',
	ENEMY_TANK = 'enemy_tank',
	PROJECTILE = 'projectile',
}

// Entity type component
export
interface EntityTypeComponents {
	entityType: {
		type: EntityType;
		faction: 'player' | 'enemy' | 'neutral';  // Used for determining hostility
	};
}

export default
function entityTypeFeature(game: SimpleECS<Components, Events, Resources>) {
	const feature = new Feature<Components, Events, Resources>(game);
	
	return feature;
} 