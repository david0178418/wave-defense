import ECSpresso from "ecspresso";
import physicsBundle from "./bundles/physics.bundle";
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

const game = new ECSpresso<{}, Events, Resources>();

game
	.addResource('config', {
		mapSize: 2000,
		deadzonePercentWidth: 0.2,
		deadzonePercentHeight: 0.2,
	})
	.install(
		combatBundle(),
		collisionBundle(),
		physicsBundle(),
		playerControlBundle(),
		enemyBundle(),
		healthBundle(),
		gameStateBundle(),
	)
	.eventBus
	.publish('initializeGame', { game });