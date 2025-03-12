import { Bundle } from "../lib/simple-ecs";

interface Components {
	frozen: Frozen;
	position: Position;
	velocity: Velocity;
	acceleration: Acceleration;
	drag: Drag;
	maxVelocity: MaxVelocity;
}

export default
function movementFeature() {
	return new Bundle<Components>()
		.addSystem('movement-system')
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
		.bundle;
}

export
type Frozen = true;

export
interface Acceleration {
	x: number;
	y: number;
}

export
interface Drag {
	x: number;
	y: number;
}

export
interface Position {
	x: number;
	y: number;
}

export
interface Velocity {
	x: number;
	y: number;
}

export
interface Speed {
	x: number;
	y: number;
}

export
interface MaxVelocity {
	x: number;
	y: number;
}