import { createBundle } from "../lib/simple-ecs";
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

// TODO Probably dead or needs to be moved...?
export default
function entityTypeFeature() {
	// Create a bundle for entity type functionality
	return createBundle<EntityTypeComponents>();
} 