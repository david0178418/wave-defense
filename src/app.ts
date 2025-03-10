import SimpleECS, { createBundle } from "./lib/simple-ecs";
import type { Components, Events, Resources } from "./types";

// Import features
import movementFeature from "./features/movement-feature";
import playerControlFeature from "./features/player-control-feature";
import enemyFeature from "./features/enemy-feature";
import healthFeature from "./features/health-feature";
import gameStateFeature from "./features/game-state-feature";
import combatFeature from "./features/combat-feature";
import collisionFeature from "./features/collision-feature";

// Create game instance
const game = new SimpleECS<Components, Events, Resources>();

const fooBundle = createBundle<Components, Events, Resources>();

// Initialize game resources
fooBundle.addResource('config', {
	mapSize: 2000,
	deadzonePercentWidth: 0.2,
	deadzonePercentHeight: 0.2,
});

// Install features
// Note the order is important - core systems like entityType should be installed first
game
	.install(fooBundle)
	.install(combatFeature())
	.install(collisionFeature())
	.install(movementFeature())
	.install(playerControlFeature())
	.install(enemyFeature())
	.install(healthFeature())
	.install(gameStateFeature(game));

// Start the game
game.eventBus.publish('initializeGame');
