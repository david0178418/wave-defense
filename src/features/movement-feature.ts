import SimpleECS, { Feature, createSystem } from "../lib/simple-ecs";

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
		.addSystem(
			createSystem<MovementComponents>('apply-velocity')
				.addQuery('entities', {
					with: ['position', 'velocity'] as const,
					without: ['frozen'] as const
				})
				.setProcess((queries, deltaTime) => {
					for (const entity of queries.entities) {
						entity.components.position.x += entity.components.velocity.x * deltaTime;
						entity.components.position.y += entity.components.velocity.y * deltaTime;
					}
				})
				.build()
		)
		.addSystem(
			createSystem<MovementComponents>('apply-acceleration')
				.addQuery('entities', {
					with: ['velocity', 'acceleration'] as const,
					without: ['frozen'] as const
				})
				.setProcess((queries, deltaTime) => {
					for (const entity of queries.entities) {
						entity.components.velocity.x += entity.components.acceleration.x * deltaTime;
						entity.components.velocity.y += entity.components.acceleration.y * deltaTime;
					}
				})
				.build()
		)
		.addSystem(
			createSystem<MovementComponents>('apply-drag')
				.addQuery('entities', {
					with: ['velocity', 'drag'] as const,
					without: ['frozen'] as const
				})
				.setProcess((queries, deltaTime) => {
					for (const entity of queries.entities) {
						entity.components.velocity.x -= entity.components.velocity.x * entity.components.drag.x * deltaTime;
						entity.components.velocity.y -= entity.components.velocity.y * entity.components.drag.y * deltaTime;
					}
				})
				.build()
		)
		.addSystem(
			createSystem<MovementComponents>('apply-max-velocity')
				.addQuery('entities', {
					with: ['velocity', 'maxVelocity'] as const,
					without: ['frozen'] as const
				})
				.setProcess((queries) => {
					for (const entity of queries.entities) {
						entity.components.velocity.x = Math.min(Math.abs(entity.components.velocity.x), entity.components.maxVelocity.x) * Math.sign(entity.components.velocity.x);
						entity.components.velocity.y = Math.min(Math.abs(entity.components.velocity.y), entity.components.maxVelocity.y) * Math.sign(entity.components.velocity.y);
					}
				})
				.build()
		)
		.install();
}

