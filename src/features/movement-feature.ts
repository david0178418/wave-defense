import SimpleECS, { Feature } from "../lib/simple-ecs";

export
interface MovementComponents {
	acceleration: { x: number; y: number };
	drag: { x: number; y: number };
	frozen: true;
	position: { x: number; y: number };
	velocity: { x: number; y: number };
	speed: { x: number; y: number };
	maxVelocity: { x: number; y: number };
}

export default
function movementFeature(game: SimpleECS<any, any, any>) {
	return new Feature<MovementComponents>(game)
		.addSystem({
			label: "apply-velocity",
			with: [
				'position',
				'velocity',
			],
			without: ['frozen'],
			process(entities, deltaTime) {
				for (const entity of entities) {
					entity.components.position.x += entity.components.velocity.x * deltaTime;
					entity.components.position.y += entity.components.velocity.y * deltaTime;
				}
			},
		})
		.addSystem({
			label: "apply-acceleration",
			with: [
				'velocity',
				'acceleration',
			],
			without: ['frozen'],
			process(entities, deltaTime) {
				for (const entity of entities) {
					entity.components.velocity.x += entity.components.acceleration.x * deltaTime;
					entity.components.velocity.y += entity.components.acceleration.y * deltaTime;
				}
			},
		})
		.addSystem({
			label: "apply-drag",
			with: [
				'velocity',
				'drag',
			],
			without: ['frozen'],
			process(entities, deltaTime) {
				for (const entity of entities) {
					entity.components.velocity.x -= entity.components.velocity.x * entity.components.drag.x * deltaTime;
					entity.components.velocity.y -= entity.components.velocity.y * entity.components.drag.y * deltaTime;
				}
			},
		})
		
	.addSystem({
		label: "apply-max-velocity",
		with: [
			'velocity',
			'maxVelocity',
		],
		without: ['frozen'],
		process(entities) {
			for (const entity of entities) {
				entity.components.velocity.x = Math.min(Math.abs(entity.components.velocity.x), entity.components.maxVelocity.x) * Math.sign(entity.components.velocity.x);
				entity.components.velocity.y = Math.min(Math.abs(entity.components.velocity.y), entity.components.maxVelocity.y) * Math.sign(entity.components.velocity.y);
			}
		},
	})
	.install();
}

