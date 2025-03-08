import { expect, describe, test } from 'bun:test';
import SimpleECS from './simple-ecs';
import { createSystem } from './system-builder';

interface TestComponents {
	position: { x: number; y: number };
	velocity: { x: number; y: number };
	health: { value: number };
	collision: { radius: number; isColliding: boolean };
	damage: { value: number };
	lifetime: { remaining: number };
	state: { current: string; previous: string };
}

describe('SimpleECS', () => {
	test('should manage entity lifecycle', () => {
		const world = new SimpleECS<TestComponents>();
		
		// Creating entities should generate unique IDs
		const entity1 = world.createEntity();
		const entity2 = world.createEntity();
		expect(entity1).not.toBe(entity2);
		
		// Creating and removing entities should work
		const entity3 = world.createEntity();
		const removed = world.removeEntity(entity3.id);
		expect(removed).toBe(true);
		
		// Removing a non-existent entity should fail gracefully
		const removedAgain = world.removeEntity(entity3.id);
		expect(removedAgain).toBe(false);
	});
	
	test('should manage components', () => {
		const world = new SimpleECS<TestComponents>();
		
		const entity = world.createEntity();
		
		// Adding components
		world.addComponent(entity.id, 'position', { x: 10, y: 20 });
		world.addComponent(entity.id, 'velocity', { x: 5, y: 10 });
		
		// Getting components
		const position = world.getComponent(entity.id, 'position');
		expect(position).toEqual({ x: 10, y: 20 });
		
		// Removing components
		world.removeComponent(entity.id, 'position');
		const positionAfterRemoval = world.getComponent(entity.id, 'position');
		expect(positionAfterRemoval).toBeNull();
	});
	
	test('should run systems with queries', () => {
		const world = new SimpleECS<TestComponents>();
		
		const entity1 = world.createEntity();
		world.addComponent(entity1.id, 'position', { x: 0, y: 0 });
		world.addComponent(entity1.id, 'velocity', { x: 5, y: 10 });
		
		const entity2 = world.createEntity();
		world.addComponent(entity2.id, 'position', { x: 100, y: 100 });
		world.addComponent(entity2.id, 'health', { value: 100 });
		
		const processedEntities: number[] = [];
		
		world.addSystem(
			createSystem<TestComponents>('MovementSystem')
			.addQuery('entities', {
				with: ['position', 'velocity'],
				without: ['health'],
			})
			.setProcess((queries) => {
				for (const entity of queries.entities) {
					processedEntities.push(entity.id);

					// In a real system, we'd update position based on velocity and deltaTime
				}
			})
		);
		
		world.update(1/60);
		
		// Only entity1 should match the query
		expect(processedEntities).toEqual([entity1.id]);
	});
	
	test('should manage resources', () => {
		const world = new SimpleECS();
		
		// Adding resources
		world.addResource('config', { debug: true, maxEntities: 1000 });
		
		// Getting resources
		const config = world.getResource('config');
		expect(config).toEqual({ debug: true, maxEntities: 1000 });
		
		// Has resource
		expect(world.hasResource('config')).toBe(true);
		expect(world.hasResource('nonExistent')).toBe(false);
		
		// Removing resources
		const removed = world.removeResource('config');
		expect(removed).toBe(true);
		
		// After removal
		expect(world.hasResource('config')).toBe(false);
	});
	
	test('should remove systems by label', () => {
		const world = new SimpleECS<TestComponents>();
		
		// Add a system
		let processRan = false;
		
		world.addSystem(
			createSystem<TestComponents>('MovementSystem')
			.addQuery('entities', {
				with: ['position', 'velocity'],
			})
			.setProcess((queries) => {
				processRan = true;
			})
		);
		
		// Remove the system
		const removed = world.removeSystem('MovementSystem');
		expect(removed).toBe(true);
		
		// Running update should not trigger the removed system
		world.update(1/60);
		expect(processRan).toBe(false);
		
		// Removing a non-existent system should fail gracefully
		const removedAgain = world.removeSystem('MovementSystem');
		expect(removedAgain).toBe(false);
	});
	
	test('should handle attaching and detaching systems', () => {
		const world = new SimpleECS<TestComponents>();
		
		// Set up tracking variables
		let attachCalled = false;
		let detachCalled = false;
		let processCalled = false;
		
		// Create a system with lifecycle hooks
		world.addSystem(
			createSystem<TestComponents>('MovementControlSystem')
			.setOnAttach(() => {
				attachCalled = true;
			})
			.setOnDetach(() => {
				detachCalled = true;
			})
			.setProcess((queries) => {
				processCalled = true;
			})
		);
		
		// onAttach should be called immediately when added
		expect(attachCalled).toBe(true);
		
		// Update should trigger process
		world.update(1/60);
		expect(processCalled).toBe(true);
		
		// Removing should trigger onDetach
		world.removeSystem('MovementControlSystem');
		expect(detachCalled).toBe(true);
	});
	
	test('should handle state transitions in systems', () => {
		const world = new SimpleECS<TestComponents>();
		
		// Create an entity with state
		const entity = world.createEntity();
		world.addComponent(entity.id, 'state', { current: 'idle', previous: '' });
		
		// Create a system that updates state
		world.addSystem(
			createSystem<TestComponents>('StateSystem')
			.addQuery('entities', {
				with: ['state'],
			})
			.setProcess((queries) => {
				for (const entity of queries.entities) {
					const state = entity.components.state;
					state.previous = state.current;
					state.current = 'running';
				}
			})
		);
		
		// Run the update
		world.update(1/60);
		
		// Check that state was updated
		const state = world.getComponent(entity.id, 'state');
		expect(state?.current).toBe('running');
		expect(state?.previous).toBe('idle');
	});
	
	test('should track entity lifetimes', () => {
		const world = new SimpleECS<TestComponents>();
		
		// Create entities with lifetime components
		const entity1 = world.createEntity();
		world.addComponent(entity1.id, 'lifetime', { remaining: 2.0 });
		
		const entity2 = world.createEntity();
		world.addComponent(entity2.id, 'lifetime', { remaining: 0.5 });
		
		// Track which entities were removed
		const removedEntities: number[] = [];
		
		// Create a lifetime system
		world.addSystem(
			createSystem<TestComponents>('LifetimeSystem')
			.addQuery('entities', {
				with: ['lifetime'],
			})
			.setProcess((queries, deltaTime) => {
				for (const entity of queries.entities) {
					// Reduce the remaining lifetime
					entity.components.lifetime.remaining -= deltaTime;
					
					// Remove entities with expired lifetimes
					if (entity.components.lifetime.remaining <= 0) {
						removedEntities.push(entity.id);
						world.removeEntity(entity.id);
					}
				}
			})
		);
		
		// First update - entity2 should expire
		world.update(1.0);
		expect(removedEntities).toEqual([entity2.id]);
		removedEntities.length = 0;
		
		// Second update - entity1 should expire
		world.update(1.5);
		expect(removedEntities).toEqual([entity1.id]);
	});
	
	test('should handle component additions and removals during update', () => {
		const world = new SimpleECS<TestComponents>();
		
		// Create entity without components yet
		const entity = world.createEntity();
		
		// Create a system that adds and removes components
		world.addSystem(
			createSystem<TestComponents>('DynamicComponentSystem')
			.addQuery('withPosition', {
				with: ['position'],
			})
			.addQuery('withoutPosition', {
				with: [],
				without: ['position'],
			})
			.setProcess((queries) => {
				// First, process entities with position (should be empty first update)
				for (const entity of queries.withPosition) {
					// Remove the position component
					world.removeComponent(entity.id, 'position');
				}
				
				// Then, process entities without position 
				for (const entity of queries.withoutPosition) {
					// Add position component
					world.addComponent(entity.id, 'position', { x: 0, y: 0 });
				}
			})
		);
		
		// First update - should add position
		world.update(1/60);
		expect(Object.keys(entity.components)).toEqual([
			`position`,
		]);
		
		// Second update - should remove position
		world.update(1/60);
		expect(Object.keys(entity.components)).toEqual([]);
	});
});
