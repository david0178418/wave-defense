import { createBundle } from "../lib/simple-ecs";

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
function movementFeature() {
	// Create a bundle with the movement functionality
	const bundle = createBundle<MovementComponents>();

	return bundle
		.addSystem(
			bundle
				.createSystem('movement-system')
				.addQuery('positionEntities', {
					with: ['position', 'velocity'],
					without: ['frozen']
				})
				.addQuery('accelerationEntities', {
					with: ['velocity', 'acceleration'],
					without: ['frozen']
				})
				.addQuery('dragEntities', {
					with: ['velocity', 'drag'],
					without: ['frozen']
				})
				.addQuery('maxVelocityEntities', {
					with: ['velocity', 'maxVelocity'],
					without: ['frozen']
				})
				.setProcess((queries, deltaTime) => {
					// Apply acceleration
					for (const entity of queries.accelerationEntities) {
						entity.components.velocity.x += entity.components.acceleration.x * deltaTime;
						entity.components.velocity.y += entity.components.acceleration.y * deltaTime;
					}
					
					// Apply drag
					for (const entity of queries.dragEntities) {
						entity.components.velocity.x -= entity.components.velocity.x * entity.components.drag.x * deltaTime;
						entity.components.velocity.y -= entity.components.velocity.y * entity.components.drag.y * deltaTime;
					}
					
					// Apply max velocity
					for (const entity of queries.maxVelocityEntities) {
						entity.components.velocity.x = Math.min(Math.abs(entity.components.velocity.x), entity.components.maxVelocity.x) * Math.sign(entity.components.velocity.x);
						entity.components.velocity.y = Math.min(Math.abs(entity.components.velocity.y), entity.components.maxVelocity.y) * Math.sign(entity.components.velocity.y);
					}
					
					// Apply velocity
					for (const entity of queries.positionEntities) {
						entity.components.position.x += entity.components.velocity.x * deltaTime;
						entity.components.position.y += entity.components.velocity.y * deltaTime;
					}
				})
		);
}

