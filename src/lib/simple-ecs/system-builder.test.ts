import { expect, describe, test } from 'bun:test';
import SimpleECS from './simple-ecs';
import { createSystem } from './system-builder';

// Define component types for testing
interface TestComponents {
	position: { x: number; y: number };
	velocity: { x: number; y: number };
	health: { value: number };
	collision: { radius: number; isColliding: boolean };
	damage: { value: number };
	lifetime: { remaining: number };
	state: { current: string; previous: string };
}

describe('SystemBuilder', () => {
	test('should create a system with proper query typing', () => {
		const world = new SimpleECS<TestComponents>();
		const entity1 = world.createEntity();

		world.addComponent(entity1, 'position', { x: 0, y: 0 });
		world.addComponent(entity1, 'velocity', { x: 5, y: 10 });
		
		const entity2 = world.createEntity();
		world.addComponent(entity2, 'position', { x: 100, y: 100 });
		
		const processedEntities: number[] = [];
		
		// Create a system using the builder
		const system = createSystem<TestComponents>('movement')
			.addQuery('moving', {
				with: ['position', 'velocity'],
			})
			.setProcess((queries, deltaTime, entityManager) => {
				// TypeScript correctly infers queries.moving
				for (const entity of queries.moving) {
					// TypeScript knows these components exist
					// Use the components to prevent unused variable warnings
					processedEntities.push(entity.id);
				}
			})
			.build();
		
		world.addSystem(system);
		world.update(1/60);
		
		expect(processedEntities).toEqual([entity1]);
	});
	
	test('should handle multiple query definitions', () => {
		const world = new SimpleECS<TestComponents>();
		
		// Create entities with different component combinations
		const positionEntity = world.createEntity();
		world.addComponent(positionEntity, 'position', { x: 10, y: 20 });
		
		const velocityEntity = world.createEntity();
		world.addComponent(velocityEntity, 'velocity', { x: 5, y: 10 });
		
		const movingEntity = world.createEntity();
		world.addComponent(movingEntity, 'position', { x: 0, y: 0 });
		world.addComponent(movingEntity, 'velocity', { x: 1, y: 1 });
		
		const positionEntities: number[] = [];
		const velocityEntities: number[] = [];
		
		// Create a system with multiple queries
		const system = createSystem<TestComponents>('multiQuery')
			.addQuery('positions', {
				with: ['position'],
			})
			.addQuery('velocities', {
				with: ['velocity'],
			})
			.setProcess((queries, deltaTime, entityManager) => {
				// Access position entities with proper typing
				for (const entity of queries.positions) {
					positionEntities.push(entity.id);
					// Use the component to prevent unused variable warning
					void entity.components.position.x;
				}
				
				// Access velocity entities with proper typing
				for (const entity of queries.velocities) {
					velocityEntities.push(entity.id);
					// Use the component to prevent unused variable warning
					void entity.components.velocity.y;
				}
			})
			.build();
		
		world.addSystem(system);
		world.update(1);
		
		// Should contain the position entity and the moving entity
		expect(positionEntities.sort()).toEqual([positionEntity, movingEntity].sort());
		
		// Should contain the velocity entity and the moving entity
		expect(velocityEntities.sort()).toEqual([velocityEntity, movingEntity].sort());
	});
	
	test('should handle lifecycle hooks', () => {
		const world = new SimpleECS<TestComponents>();
		
		let initialized = false;
		let cleanedUp = false;
		let processRan = false;
		
		const system = createSystem<TestComponents>('lifecycle')
			.addQuery('entities', {
				with: ['position'],
			})
			.setProcess((queries, deltaTime, entityManager) => {
				processRan = true;
			})
			.setOnAttach((entityManager, resourceManager, eventBus) => {
				initialized = true;
			})
			.setOnDetach((entityManager, resourceManager, eventBus) => {
				cleanedUp = true;
			})
			.build();
		
		// Should call onAttach when added
		world.addSystem(system);
		expect(initialized).toBe(true);
		
		// Should call process when updated
		world.update(1);
		expect(processRan).toBe(true);
		
		// Should call onDetach when removed
		world.removeSystem('lifecycle');
		expect(cleanedUp).toBe(true);
	});
	
	test('should handle without components in queries', () => {
		const world = new SimpleECS<TestComponents>();
		
		// Entity with position but no velocity
		const staticEntity = world.createEntity();
		world.addComponent(staticEntity, 'position', { x: 10, y: 20 });
		
		// Entity with both position and velocity
		const movingEntity = world.createEntity();
		world.addComponent(movingEntity, 'position', { x: 0, y: 0 });
		world.addComponent(movingEntity, 'velocity', { x: 1, y: 1 });
		
		const staticEntities: number[] = [];
		
		// Create a system that queries entities with position but without velocity
		const system = createSystem<TestComponents>('staticObjects')
			.addQuery('static', {
				with: ['position'],
				without: ['velocity'],
			})
			.setProcess((queries, deltaTime, entityManager) => {
				for (const entity of queries.static) {
					staticEntities.push(entity.id);
					// Access the position component to prevent unused variable warning
					const position = entity.components.position;
					expect(position).toBeDefined();
				}
			})
			.build();
		
		world.addSystem(system);
		world.update(1);
		
		// Should only contain the static entity
		expect(staticEntities).toEqual([staticEntity]);
	});
}); 