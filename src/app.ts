import SimpleECS from "./lib/simple-ecs";
import movementFeature from "./features/movement-feature";
import playerControlFeature from "./features/player-control-feature";
import enemyFeature from "./features/enemy-feature";
import healthFeature from "./features/health-feature";
import gameStateFeature from "./features/game-state-feature";
import combatFeature from "./features/combat-feature";
import collisionFeature from "./features/collision-feature";
import type { ConfigResource } from "./types";

interface Resources {
	config: ConfigResource;
}

interface Events {
	initializeGame: InitializeGame;
}

export
interface InitializeGame {
	game: typeof game;
};

const game = new SimpleECS<{}, Events, Resources>();

game
	.addResource('config', {
		mapSize: 2000,
		deadzonePercentWidth: 0.2,
		deadzonePercentHeight: 0.2,
	})
	.install(combatFeature())
	.install(collisionFeature())
	.install(movementFeature())
	.install(playerControlFeature())
	.install(enemyFeature())
	.install(healthFeature())
	.install(gameStateFeature());

game.eventBus.publish('initializeGame', {
	game,
});
