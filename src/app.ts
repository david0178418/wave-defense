import SimpleECS from "./lib/simple-ecs";
import movementBundle from "./bundles/movement.bundle";
import playerControlBundle from "./bundles/player-control.bundle";
import enemyBundle from "./bundles/enemy.bundle";
import healthBundle from "./bundles/health.bundle";
import gameStateBundle from "./bundles/game-state.bundle";
import combatBundle from "./bundles/combat.bundle";
import collisionBundle from "./bundles/collision.bundle";
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
	.install(combatBundle())
	.install(collisionBundle())
	.install(movementBundle())
	.install(playerControlBundle())
	.install(enemyBundle())
	.install(healthBundle())
	.install(gameStateBundle());

game.eventBus.publish('initializeGame', {
	game,
});
