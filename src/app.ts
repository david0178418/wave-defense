import SimpleECS from "./lib/simple-ecs";
import type { Components, Events, Resources } from "./types";

// Import features
import movementFeature from "./features/movement-feature";
import playerControlFeature from "./features/player-control-feature";
import enemyFeature from "./features/enemy-feature";
import healthFeature from "./features/health-feature";
import gameStateFeature from "./features/game-state-feature";
import entityTypeFeature from "./features/entity-type-feature";
import combatFeature from "./features/combat-feature";
import collisionFeature from "./features/collision-feature";

// Create game instance
const game = new SimpleECS<Components, Events, Resources>();

// Initialize game resources
game.addResource('config', {
	mapSize: 2000,
	deadzonePercentWidth: 0.2,
	deadzonePercentHeight: 0.2,
});

// Install features
// Note the order is important - core systems like entityType should be installed first
entityTypeFeature(game);
combatFeature(game);
collisionFeature(game);
movementFeature(game);
playerControlFeature(game);
enemyFeature(game);
healthFeature(game);
gameStateFeature(game);

// Start the game
game.eventBus.publish('initializeGame');
