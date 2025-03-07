import SimpleECS, { Feature, createSystem } from "../lib/simple-ecs";
import type { MovementComponents } from "./movement-feature";

export
interface PlayerControlComponents extends MovementComponents {
	player: true;
}

export
interface PlayerControlResources {
	activeKeyMap: ActiveControlMap;
}

export
interface ActiveControlMap {
	up: boolean;
	down: boolean;
	left: boolean;
	right: boolean;
}

export default
function playerControlFeature(game: SimpleECS<any, any, any>) {
	return new Feature<PlayerControlComponents, Record<string, any>, PlayerControlResources>(game)
		.addResource('activeKeyMap', keyMap())
		.addSystem(
			createSystem<PlayerControlComponents>('player-control')
				.addQuery('players', {
					with: ['acceleration', 'speed', 'player'] as const
				})
				.setProcess((queries, deltaTime, entityManager, resourceManager) => {
					const players = queries.players;
					if (!players || players.length === 0) return;
					
					const player = players[0];
					if (!player) return;
					
					const activeKeyMap = resourceManager.get('activeKeyMap');
	
					if(activeKeyMap.up) {
						player.components.acceleration.y = -player.components.speed.y;
					} else if(activeKeyMap.down) {
						player.components.acceleration.y = player.components.speed.y;
					} else {
						player.components.acceleration.y = 0;
					}
	
					if(activeKeyMap.left) {
						player.components.acceleration.x = -player.components.speed.x;
					} else if(activeKeyMap.right) {
						player.components.acceleration.x = player.components.speed.x;
					} else {
						player.components.acceleration.x = 0;
					}
				})
				.build()
		)
		.install();
}

function keyMap(): ActiveControlMap {
	const keyMap = {
		'up': false,
		'down': false,
		'left': false,
		'right': false,
	};

	window.addEventListener('keydown', (event) => {
		switch(event.key) {
			case 'w':
			case 'ArrowUp':
				keyMap.up = true;
				break;
			case 's':
			case 'ArrowDown':
				keyMap.down = true;
				break;
			case 'a':
			case 'ArrowLeft':
				keyMap.left = true;
				break;
			case 'd':
			case 'ArrowRight':
				keyMap.right = true;
				break;
		}
	});

	window.addEventListener('keyup', (event) => {
		switch(event.key) {
			case 'w':
			case 'ArrowUp':
				keyMap.up = false;
				break;
			case 's':
			case 'ArrowDown':
				keyMap.down = false;
				break;
			case 'a':
			case 'ArrowLeft':
				keyMap.left = false;
				break;
			case 'd':
			case 'ArrowRight':
				keyMap.right = false;
				break;
		}
	});

	return keyMap;
}