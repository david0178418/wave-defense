import { World } from "./simple-ecs";

interface Components {
	health: { current: number; max: number };
	position: { x: number; y: number };
	velocity: { x: number; y: number };
	fiz: {buz: boolean;}
}


const world = new World<Components>();

// const allEntities = world.entityManager.getEntitiesWithComponents(['position'], ['fiz', 'health']);


world.addSystem({
	label: "movement",
	with: ['health'],
	without: ['fiz'],
	process(entities) {
		for (const entity of entities) {
			console.log(entity);
		}
	},
});