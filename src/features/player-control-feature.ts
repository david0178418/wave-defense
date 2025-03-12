import { Bundle } from "../lib/simple-ecs";
import type { Acceleration, Speed } from "./movement-feature";

interface Components {
	player: true;
	acceleration: Acceleration;
	speed: Speed;
}


interface Resources {
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
function playerControlFeature() {
	return new Bundle<Components, {}, Resources>()
	.addResource('activeKeyMap', keyMap())
		.addSystem('player-control')
		.addQuery('players', {
			with: ['acceleration', 'speed', 'player']
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
		.bundle;
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