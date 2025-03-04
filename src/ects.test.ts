import { expect, describe, test } from 'bun:test';
import { World } from './ects';

// Define type for test components
interface TestComponents {
	position: { x: number; y: number };
	velocity: { x: number; y: number };
	health: { value: number };
	name: string;
	parent: { entityId: number };
	children: { entityIds: number[] };
	collision: { radius: number; isColliding: boolean };
	damage: { value: number };
	lifetime: { remaining: number };
	state: { current: string; previous: string };
}

describe('World', () => {
	test('should create a new entity', () => {
		const world = new World<TestComponents>();
		const entityId = world.createEntity();
		
		expect(entityId).toBe(0); // First entity should have id 0
		
		const secondEntityId = world.createEntity();
		expect(secondEntityId).toBe(1); // Second entity should have id 1
	});
	
	test('should add components to entities', () => {
		const world = new World<TestComponents>();
		const entityId = world.createEntity();
		
		// Add a position component
		world.addComponent(entityId, 'position', { x: 10, y: 20 });
		
		// Verify component was added
		const position = world.getComponent(entityId, 'position');
		expect(position).toEqual({ x: 10, y: 20 });
	});
	
	test('should remove components from entities', () => {
		const world = new World<TestComponents>();
		const entityId = world.createEntity();
		
		// Add a position component
		world.addComponent(entityId, 'position', { x: 10, y: 20 });
		
		// Remove the component
		world.removeComponent(entityId, 'position');
		
		// Verify component was removed
		const position = world.getComponent(entityId, 'position');
		expect(position).toBeNull();
	});
	
	test('should remove entities', () => {
		const world = new World<TestComponents>();
		const entityId = world.createEntity();
		
		// Add some components
		world.addComponent(entityId, 'position', { x: 10, y: 20 });
		world.addComponent(entityId, 'health', { value: 100 });
		
		// Remove the entity
		const result = world.removeEntity(entityId);
		expect(result).toBe(true);
		
		// Try to get a component from removed entity (should throw)
		expect(() => world.getComponent(entityId, 'position')).toThrow();
	});
	
	test('should process systems with the correct entities', () => {
		const world = new World<TestComponents>();
		
		// Create test entities
		const entity1 = world.createEntity();
		world.addComponent(entity1, 'position', { x: 0, y: 0 });
		world.addComponent(entity1, 'velocity', { x: 5, y: 10 });
		
		const entity2 = world.createEntity();
		world.addComponent(entity2, 'position', { x: 100, y: 100 });
		// No velocity for entity2
		
		const entity3 = world.createEntity();
		world.addComponent(entity3, 'position', { x: 200, y: 200 });
		world.addComponent(entity3, 'velocity', { x: -5, y: -5 });
		world.addComponent(entity3, 'health', { value: 50 }); 
		
		// Create a movement system that requires position and velocity
		const processedEntities: number[] = [];
		
		world.addSystem({
			label: 'MovementSystem',
			with: ['position', 'velocity'] as const,
			without: ['health'] as const,
			process(entities) {
				for (const entity of entities) {
					// Record which entities were processed
					processedEntities.push(entity.id);
					
					// In a real system, we'd update position based on velocity and deltaTime
				}
			}
		});
		
		// Run the systems
		world.update(1/60);
		
		// Only entity1 should be processed (entity2 has no velocity, entity3 has health)
		expect(processedEntities).toEqual([entity1]);
	});
	
	test('should allow systems to modify entities', () => {
		const world = new World<TestComponents>();
		
		// Create test entities with position and velocity
		const entity1 = world.createEntity();
		world.addComponent(entity1, 'position', { x: 10, y: 20 });
		world.addComponent(entity1, 'velocity', { x: 5, y: 10 });
		
		// Add a movement system that updates positions
		world.addSystem({
			label: 'MovementSystem',
			with: ['position', 'velocity'] as const,
			process(entities, deltaTime, entityManager) {
				for (const entity of entities) {
					const position = entity.components.position;
					const velocity = entity.components.velocity;
					
					// Update position based on velocity
					entityManager.addComponent(entity.id, 'position', {
						x: position.x + velocity.x * deltaTime,
						y: position.y + velocity.y * deltaTime
					});
				}
			}
		});
		
		// Run the system with a deltaTime of 1 second
		world.update(1.0);
		
		// Check if position was updated correctly
		const updatedPosition = world.getComponent(entity1, 'position');
		expect(updatedPosition).toEqual({ x: 15, y: 30 });
	});
	
	test('should throw when accessing components of non-existent entities', () => {
		const world = new World<TestComponents>();
		
		// Try to get a component from a non-existent entity
		expect(() => world.getComponent(999, 'position')).toThrow();
		
		// Try to add a component to a non-existent entity
		expect(() => world.addComponent(999, 'position', { x: 10, y: 20 })).toThrow();
		
		// Try to remove a component from a non-existent entity
		expect(() => world.removeComponent(999, 'position')).toThrow();
	});
	
	test('should return null for non-existent components', () => {
		const world = new World<TestComponents>();
		const entityId = world.createEntity();
		
		// Get a component that hasn't been added
		const health = world.getComponent(entityId, 'health');
		expect(health).toBeNull();
	});
	
	test('should return false when removing non-existent entity', () => {
		const world = new World<TestComponents>();
		
		// Try to remove an entity that doesn't exist
		const result = world.removeEntity(999);
		expect(result).toBe(false);
	});
	
	// Complex component relationship tests begin here
	
	test('should handle parent-child relationships between entities', () => {
		const world = new World<TestComponents>();
		
		// Create parent entity
		const parentId = world.createEntity();
		world.addComponent(parentId, 'position', { x: 100, y: 100 });
		world.addComponent(parentId, 'children', { entityIds: [] });
		
		// Create child entities
		const childId1 = world.createEntity();
		world.addComponent(childId1, 'position', { x: 10, y: 10 });
		world.addComponent(childId1, 'parent', { entityId: parentId });
		
		const childId2 = world.createEntity();
		world.addComponent(childId2, 'position', { x: -10, y: -10 });
		world.addComponent(childId2, 'parent', { entityId: parentId });
		
		// Update parent's children list
		world.addComponent(parentId, 'children', { entityIds: [childId1, childId2] });
		
		// Add a hierarchical movement system
		world.addSystem({
			label: 'HierarchySystem',
			with: ['position', 'children'] as const,
			process(entities, deltaTime, entityManager) {
				for (const entity of entities) {
					const parentPos = entity.components.position;
					const children = entity.components.children.entityIds;
					
					// Update all children positions relative to parent
					for (const childId of children) {
						const childPos = entityManager.getComponent(childId, 'position');
						if (childPos) {
							// Move children with parent (maintaining relative position)
							entityManager.addComponent(childId, 'position', {
								x: parentPos.x + childPos.x,
								y: parentPos.y + childPos.y
							});
						}
					}
				}
			}
		});
		
		// Run the system to update child positions
		world.update(1.0);
		
		// Check child positions are correctly updated relative to parent
		const child1Pos = world.getComponent(childId1, 'position');
		const child2Pos = world.getComponent(childId2, 'position');
		
		expect(child1Pos).toEqual({ x: 110, y: 110 });
		expect(child2Pos).toEqual({ x: 90, y: 90 });
	});
	
	test('should handle collision detection between entities', () => {
		const world = new World<TestComponents>();
		
		// Create two entities with position and collision components
		const entity1 = world.createEntity();
		world.addComponent(entity1, 'position', { x: 0, y: 0 });
		world.addComponent(entity1, 'collision', { radius: 10, isColliding: false });
		
		const entity2 = world.createEntity();
		world.addComponent(entity2, 'position', { x: 15, y: 0 });
		world.addComponent(entity2, 'collision', { radius: 10, isColliding: false });
		
		const entity3 = world.createEntity();
		world.addComponent(entity3, 'position', { x: 100, y: 100 });
		world.addComponent(entity3, 'collision', { radius: 5, isColliding: false });
		
		// Add a collision detection system
		world.addSystem({
			label: 'CollisionSystem',
			with: ['position', 'collision'] as const,
			process(entities, deltaTime, entityManager) {
				// Reset all collision flags
				for (const entity of entities) {
					entityManager.addComponent(entity.id, 'collision', {
						...entity.components.collision,
						isColliding: false
					});
				}
				
				// Check for collisions between all pairs of entities
				for (let i = 0; i < entities.length; i++) {
					for (let j = i + 1; j < entities.length; j++) {
						const entityA = entities[i];
						const entityB = entities[j];
						
						// Make sure both entities exist - prevents TS errors
						if (!entityA || !entityB) continue;
						
						const posA = entityA.components.position;
						const posB = entityB.components.position;
						const radiusA = entityA.components.collision.radius;
						const radiusB = entityB.components.collision.radius;
						
						// Calculate distance between entities
						const dx = posA.x - posB.x;
						const dy = posA.y - posB.y;
						const distance = Math.sqrt(dx * dx + dy * dy);
						
						// Check if entities are colliding
						if (distance < radiusA + radiusB) {
							// Set both entities as colliding
							entityManager.addComponent(entityA.id, 'collision', {
								...entityA.components.collision,
								isColliding: true
							});
							
							entityManager.addComponent(entityB.id, 'collision', {
								...entityB.components.collision,
								isColliding: true
							});
						}
					}
				}
			}
		});
		
		// Run the collision system
		world.update(1.0);
		
		// Check collision states
		const collision1 = world.getComponent(entity1, 'collision');
		const collision2 = world.getComponent(entity2, 'collision');
		const collision3 = world.getComponent(entity3, 'collision');
		
		// Entity 1 and 2 should be colliding (distance = 15, sum of radii = 20)
		expect(collision1?.isColliding).toBe(true);
		expect(collision2?.isColliding).toBe(true);
		
		// Entity 3 should not be colliding with any other entity
		expect(collision3?.isColliding).toBe(false);
	});
	
	test('should handle component interactions in a damage system', () => {
		const world = new World<TestComponents>();
		
		// Create entities with health and position
		const playerId = world.createEntity();
		world.addComponent(playerId, 'position', { x: 0, y: 0 });
		world.addComponent(playerId, 'health', { value: 100 });
		
		const enemyId = world.createEntity();
		world.addComponent(enemyId, 'position', { x: 5, y: 0 });
		world.addComponent(enemyId, 'health', { value: 50 });
		world.addComponent(enemyId, 'damage', { value: 10 });
		
		// Add a damage system that applies damage to entities in proximity
		world.addSystem({
			label: 'DamageSystem',
			with: ['position', 'health'] as const,
			process(entities, deltaTime, entityManager) {
				// Get all entities with damage component
				const damageEntities = entityManager.getEntitiesWithComponents(
					['position', 'damage'] as const
				);
				
				// For each entity with health
				for (const entity of entities) {
					const entityPos = entity.components.position;
					
					// Check if any damage entity is close enough
					for (const damageEntity of damageEntities) {
						// Skip if same entity
						if (damageEntity.id === entity.id) continue;
						
						const damagePos = damageEntity.components.position;
						const damageValue = damageEntity.components.damage.value;
						
						// Calculate distance
						const dx = entityPos.x - damagePos.x;
						const dy = entityPos.y - damagePos.y;
						const distance = Math.sqrt(dx * dx + dy * dy);
						
						// Apply damage if distance is less than 10 units
						if (distance < 10) {
							const currentHealth = entity.components.health.value;
							const newHealth = Math.max(0, currentHealth - damageValue);
							
							entityManager.addComponent(entity.id, 'health', {
								value: newHealth
							});
						}
					}
				}
			}
		});
		
		// Run the damage system
		world.update(1.0);
		
		// Check health values
		const playerHealth = world.getComponent(playerId, 'health');
		const enemyHealth = world.getComponent(enemyId, 'health');
		
		// Player should have taken damage from enemy
		expect(playerHealth?.value).toBe(90);
		
		// Enemy shouldn't have taken damage as player has no damage component
		expect(enemyHealth?.value).toBe(50);
	});
	
	test('should handle state transitions in a multi-system environment', () => {
		const world = new World<TestComponents>();
		
		// Create entity with multiple components for state machine testing
		const entityId = world.createEntity();
		world.addComponent(entityId, 'state', { current: 'idle', previous: '' });
		world.addComponent(entityId, 'position', { x: 0, y: 0 });
		world.addComponent(entityId, 'velocity', { x: 0, y: 0 });
		world.addComponent(entityId, 'lifetime', { remaining: 5 });
		
		// Add movement system that updates velocity based on state
		// Adding this system first ensures it runs before the state system
		world.addSystem({
			label: 'MovementControlSystem',
			with: ['state', 'velocity'] as const,
			process(entities, deltaTime, entityManager) {
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
			}
		});
		
		// Add state transition system (runs after movement system)
		world.addSystem({
			label: 'StateSystem',
			with: ['state', 'velocity'] as const,
			process(entities, deltaTime, entityManager) {
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
			}
		});
		
		// Add lifetime system that decrements lifetime and affects state
		world.addSystem({
			label: 'LifetimeSystem',
			with: ['lifetime'] as const,
			process(entities, deltaTime, entityManager) {
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
			}
		});
		
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
		const world = new World<TestComponents>();
		
		// Create test entity
		const entityId = world.createEntity();
		world.addComponent(entityId, 'position', { x: 0, y: 0 });
		world.addComponent(entityId, 'health', { value: 100 });
		
		// Add a system that dynamically adds and removes components
		world.addSystem({
			label: 'DynamicComponentSystem',
			with: ['position'] as const,
			process(entities, deltaTime, entityManager) {
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
			}
		});
		
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
