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
	test('should create a new entities and increment ids', () => {
		const world = new SimpleECS<TestComponents>();
		const entityId = world.createEntity();
		
		expect(entityId).toBe(1);
		
		const secondEntityId = world.createEntity();
		expect(secondEntityId).toBe(2);
	});
	
	test('should add components to entities', () => {
		const world = new SimpleECS<TestComponents>();
		const entityId = world.createEntity();
		
		world.addComponent(entityId, 'position', { x: 10, y: 20 });
		
		const position = world.getComponent(entityId, 'position');
		expect(position).toEqual({ x: 10, y: 20 });
	});
	
	test('should remove components from entities', () => {
		const world = new SimpleECS<TestComponents>();
		const entityId = world.createEntity();
		
		world.addComponent(entityId, 'position', { x: 10, y: 20 });
		
		world.removeComponent(entityId, 'position');
		
		const position = world.getComponent(entityId, 'position');
		expect(position).toBeNull();
	});
	
	test('should remove entities', () => {
		const world = new SimpleECS<TestComponents>();
		const entityId = world.createEntity();
		
		world.addComponent(entityId, 'position', { x: 10, y: 20 });
		world.addComponent(entityId, 'health', { value: 100 });
		
		const result = world.removeEntity(entityId);

		expect(result).toBe(true);
		expect(() => world.getComponent(entityId, 'position')).toThrow();
	});
	
	test('should process systems with the correct entities', () => {
		const world = new SimpleECS<TestComponents>();
		const entity1 = world.createEntity();

		world.addComponent(entity1, 'position', { x: 0, y: 0 });
		world.addComponent(entity1, 'velocity', { x: 5, y: 10 });
		
		const entity2 = world.createEntity();
		world.addComponent(entity2, 'position', { x: 100, y: 100 });
		
		const entity3 = world.createEntity();
		world.addComponent(entity3, 'position', { x: 200, y: 200 });
		world.addComponent(entity3, 'velocity', { x: -5, y: -5 });
		world.addComponent(entity3, 'health', { value: 50 }); 
		
		const processedEntities: number[] = [];
		
		world.addSystem(
			createSystem<TestComponents>('MovementSystem')
			.addQuery('entities', {
				with: ['position', 'velocity'] as const,
				without: ['health'] as const,
			})
			.setProcess(({entities}) => {
				for (const entity of entities) {
					processedEntities.push(entity.id);

					// In a real system, we'd update position based on velocity and deltaTime
				}
			})
			.build()
		);
		
		world.update(1/60);
		
		expect(processedEntities).toEqual([entity1]);
	});
	
	test('should allow systems to modify entities', () => {
		const world = new SimpleECS<TestComponents>();
		
		const entity1 = world.createEntity();
		world.addComponent(entity1, 'position', { x: 10, y: 20 });
		world.addComponent(entity1, 'velocity', { x: 5, y: 10 });
		
		world.addSystem(
			createSystem<TestComponents>('MovementSystem')
			.addQuery('entities', {
				with: ['position', 'velocity'] as const,
			})
			.setProcess(({entities}, deltaTime, entityManager) => {
				for (const entity of entities) {
					const position = entity.components.position;
					const velocity = entity.components.velocity;
					
					// Update position based on velocity
					entityManager.addComponent(entity.id, 'position', {
						x: position.x + velocity.x * deltaTime,
						y: position.y + velocity.y * deltaTime
					});
				}
			})
			.build()
		);
		
		world.update(1.0);
		
		const updatedPosition = world.getComponent(entity1, 'position');
		expect(updatedPosition).toEqual({ x: 15, y: 30 });
	});
	
	test('should throw when accessing components of non-existent entities', () => {
		const world = new SimpleECS<TestComponents>();
		
		expect(() => world.getComponent(999, 'position')).toThrow();
		expect(() => world.addComponent(999, 'position', { x: 10, y: 20 })).toThrow();
		expect(() => world.removeComponent(999, 'position')).toThrow();
	});
	
	test('should return null for non-existent components', () => {
		const world = new SimpleECS<TestComponents>();
		const entityId = world.createEntity();
		const health = world.getComponent(entityId, 'health');

		expect(health).toBeNull();
	});
	
	test('should return false when removing non-existent entity', () => {
		const world = new SimpleECS<TestComponents>();
		const result = world.removeEntity(999);
		
		expect(result).toBe(false);
	});
	
	test('should handle state transitions in a multi-system environment', () => {
		const world = new SimpleECS<TestComponents>();
		
		// Create entity with multiple components for state machine testing
		const entityId = world.createEntity();
		world.addComponent(entityId, 'state', { current: 'idle', previous: '' });
		world.addComponent(entityId, 'position', { x: 0, y: 0 });
		world.addComponent(entityId, 'velocity', { x: 0, y: 0 });
		world.addComponent(entityId, 'lifetime', { remaining: 5 });
		
		// Add movement system that updates velocity based on state
		// Adding this system first ensures it runs before the state system
		world.addSystem(
			createSystem<TestComponents>('MovementControlSystem')
			.addQuery('entities', {
				with: ['state', 'velocity'] as const,
			})
			.setProcess(({entities}, deltaTime, entityManager) => {
				for (const entity of entities) {
					const state = entity.components.state;
					
					// Initially set velocity to trigger state change
					if (state.current === 'idle' && state.previous === '') {
						entityManager.addComponent(entity.id, 'velocity', { x: 10, y: 5 });
					}
					// Change velocity based on state transitions
					else if (state.previous === 'idle' && state.current === 'moving') {
						// Already handled in first condition
					} else if (state.current === 'idle') {
						// Reset velocity when idle
						entityManager.addComponent(entity.id, 'velocity', { x: 0, y: 0 });
					}
				}
			})
			.build()
		);
		
		// Add state transition system (runs after movement system)
		world.addSystem(
			createSystem<TestComponents>('StateSystem')
			.addQuery('entities', {
				with: ['state', 'velocity'] as const,
			})
			.setProcess(({entities}, deltaTime, entityManager) => {
				for (const entity of entities) {
					const state = entity.components.state;
					const velocity = entity.components.velocity;
					
					// Store previous state before transition
					const previous = state.current;
					let current = state.current;
					
					// State transition logic
					if (state.current === 'idle' && (velocity.x !== 0 || velocity.y !== 0)) {
						current = 'moving';
					} else if (state.current === 'moving' && velocity.x === 0 && velocity.y === 0) {
						current = 'idle';
					}
					
					// Update state if changed
					if (current !== state.current) {
						entityManager.addComponent(entity.id, 'state', {
							current,
							previous
						});
					}
				}
			})
			.build()
		);
		
		// Add lifetime system that decrements lifetime and affects state
		world.addSystem(
			createSystem<TestComponents>('LifetimeSystem')
			.addQuery('entities', {
				with: ['lifetime'] as const,
			})
			.setProcess(({entities}, deltaTime, entityManager) => {
				for (const entity of entities) {
					const lifetime = entity.components.lifetime;
					const newRemaining = lifetime.remaining - deltaTime;
					
					// Update remaining lifetime
					entityManager.addComponent(entity.id, 'lifetime', {
						remaining: newRemaining
					});
					
					// If entity has a state component and lifetime expired, change state
					if (newRemaining <= 0) {
						const state = entityManager.getComponent(entity.id, 'state');
						if (state) {
							entityManager.addComponent(entity.id, 'state', {
								current: 'expired',
								previous: state.current
							});
						}
					}
				}
			})
			.build()
		);
		
		// Run a few update cycles with different delta times
		
		// First update - state should transition to moving
		world.update(1.0);
		
		// Check state after first update - should be moving with velocity
		const stateAfter1 = world.getComponent(entityId, 'state');
		const velocityAfter1 = world.getComponent(entityId, 'velocity');
		const lifetimeAfter1 = world.getComponent(entityId, 'lifetime');
		
		expect(stateAfter1?.current).toBe('moving');
		expect(stateAfter1?.previous).toBe('idle');
		expect(velocityAfter1).toEqual({ x: 10, y: 5 });
		expect(lifetimeAfter1?.remaining).toBe(4);
		
		// Second update with a longer delta time to trigger lifetime expiration
		world.update(4.0);
		
		// Check state after second update - should be expired
		const stateAfter2 = world.getComponent(entityId, 'state');
		const lifetimeAfter2 = world.getComponent(entityId, 'lifetime');
		
		expect(stateAfter2?.current).toBe('expired');
		expect(stateAfter2?.previous).toBe('moving');
		expect(lifetimeAfter2?.remaining).toBe(0);
	});
	
	test('should handle dynamic component addition and removal during system execution', () => {
		const world = new SimpleECS<TestComponents>();
		const entityId = world.createEntity();

		world.addComponent(entityId, 'position', { x: 0, y: 0 });
		world.addComponent(entityId, 'health', { value: 100 });
		
		// Add a system that dynamically adds and removes components
		world.addSystem(
			createSystem<TestComponents>('DynamicComponentSystem')
			.addQuery('entities', {
				with: ['position'] as const,
			})
			.setProcess(({entities}, deltaTime, entityManager) => {
				for (const entity of entities) {
					const health = entityManager.getComponent(entity.id, 'health');
					
					// Add velocity component for entities that have health
					if (health) {
						// First add velocity
						entityManager.addComponent(entity.id, 'velocity', { x: 5, y: 5 });
						
						// Reduce health and remove if zero
						const newHealth = Math.max(0, health.value - 10);
						entityManager.addComponent(entity.id, 'health', { value: newHealth });
						
						// If health is below threshold, add damage component
						if (newHealth < 50) {
							entityManager.addComponent(entity.id, 'damage', { value: 15 });
						}
						
						if (newHealth === 0) {
							entityManager.removeComponent(entity.id, 'health');
						}
					}
					
					// In a separate call rather than chaining - ensures velocity was just added
					// Remove velocity if it exists and add collision
					const velocity = entityManager.getComponent(entity.id, 'velocity');
					if (velocity) {
						entityManager.removeComponent(entity.id, 'velocity');
						entityManager.addComponent(entity.id, 'collision', { 
							radius: 15, 
							isColliding: false 
						});
					}
				}
			})
			.build()
		);
		
		// Run system once
		world.update(1.0);
		
		// Check component changes
		const healthAfter1 = world.getComponent(entityId, 'health');
		const velocityAfter1 = world.getComponent(entityId, 'velocity');
		const collisionAfter1 = world.getComponent(entityId, 'collision');
		const damageAfter1 = world.getComponent(entityId, 'damage');
		
		expect(healthAfter1?.value).toBe(90); // Health reduced
		expect(velocityAfter1).toBeNull(); // Velocity removed
		expect(collisionAfter1).toEqual({ radius: 15, isColliding: false }); // Collision added
		expect(damageAfter1).toBeNull(); // No damage yet
		
		// Run system multiple times to get health below threshold
		world.update(1.0);
		world.update(1.0);
		world.update(1.0);
		world.update(1.0);
		
		// Check components after health gets below threshold
		const healthAfter5 = world.getComponent(entityId, 'health');
		const damageAfter5 = world.getComponent(entityId, 'damage');
		
		expect(healthAfter5?.value).toBe(50); // Health reduced to 50
		expect(damageAfter5).toBeNull(); // No damage yet (exactly at threshold)
		
		// One more update to get below threshold
		world.update(1.0);
		
		// Check after going below threshold
		const healthAfter6 = world.getComponent(entityId, 'health');
		const damageAfter6 = world.getComponent(entityId, 'damage');
		
		expect(healthAfter6?.value).toBe(40); // Health below threshold
		expect(damageAfter6).toEqual({ value: 15 }); // Damage component added
		
		// Run until health reaches zero
		world.update(1.0);
		world.update(1.0);
		world.update(1.0);
		world.update(1.0);
		
		// Health should be removed
		const healthAfterZero = world.getComponent(entityId, 'health');
		expect(healthAfterZero).toBeNull(); // Health component removed
	});
});
