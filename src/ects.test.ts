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

// Define events for testing
interface TestEvents {
	entityCreated: { entityId: number };
	entityDestroyed: { entityId: number };
	componentAdded: { entityId: number; componentName: string };
	componentRemoved: { entityId: number; componentName: string };
	collision: { entity1Id: number; entity2Id: number };
	healthChanged: { entityId: number; oldValue: number; newValue: number };
	gameStateChanged: { oldState: string; newState: string };
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

describe('EventSystem', () => {
	test('should allow subscribing to and publishing events', () => {
		const world = new World<TestComponents, TestEvents>();
		const eventBus = world.getEventBus();
		
		// Create some test entities
		const entityId = world.createEntity();
		world.addComponent(entityId, 'position', { x: 0, y: 0 });
		
		// Set up a simple event listener
		let eventReceived = false;
		let receivedData: TestEvents['entityCreated'] = { entityId: 0 };
		
		eventBus.subscribe('entityCreated', (data) => {
			eventReceived = true;
			receivedData = data;
		});
		
		// Publish an event
		eventBus.publish('entityCreated', { entityId: 123 });
		
		// Verify event was received
		expect(eventReceived).toBe(true);
		expect(receivedData).toEqual({ entityId: 123 });
	});
	
	test('should handle one-time event subscriptions', () => {
		const world = new World<TestComponents, TestEvents>();
		const eventBus = world.getEventBus();
		
		// Set up counters
		let normalEventCount = 0;
		let onceEventCount = 0;
		
		// Subscribe to events - one normal, one with once
		eventBus.subscribe('entityCreated', () => {
			normalEventCount++;
		});
		
		eventBus.once('entityCreated', () => {
			onceEventCount++;
		});
		
		// Publish the event multiple times
		eventBus.publish('entityCreated', { entityId: 1 });
		eventBus.publish('entityCreated', { entityId: 2 });
		eventBus.publish('entityCreated', { entityId: 3 });
		
		// Verify counts
		expect(normalEventCount).toBe(3); // Normal handler called every time
		expect(onceEventCount).toBe(1);   // Once handler called only first time
	});
	
	test('should handle unsubscribing from events', () => {
		const world = new World<TestComponents, TestEvents>();
		const eventBus = world.getEventBus();
		
		let eventCount = 0;
		
		// Subscribe and store the unsubscribe function
		const unsubscribe = eventBus.subscribe('entityCreated', () => {
			eventCount++;
		});
		
		// Publish an event
		eventBus.publish('entityCreated', { entityId: 1 });
		expect(eventCount).toBe(1);
		
		// Unsubscribe and publish again
		unsubscribe();
		eventBus.publish('entityCreated', { entityId: 2 });
		
		// Count should not have increased
		expect(eventCount).toBe(1);
	});
	
	test('should handle clearing all events', () => {
		const world = new World<TestComponents, TestEvents>();
		const eventBus = world.getEventBus();
		
		let count1 = 0, count2 = 0;
		
		// Subscribe to multiple events
		eventBus.subscribe('entityCreated', () => { count1++; });
		eventBus.subscribe('entityDestroyed', () => { count2++; });
		
		// Publish events
		eventBus.publish('entityCreated', { entityId: 1 });
		eventBus.publish('entityDestroyed', { entityId: 2 });
		
		expect(count1).toBe(1);
		expect(count2).toBe(1);
		
		// Clear all events
		eventBus.clear();
		
		// Publish again
		eventBus.publish('entityCreated', { entityId: 3 });
		eventBus.publish('entityDestroyed', { entityId: 4 });
		
		// Counts should not have increased
		expect(count1).toBe(1);
		expect(count2).toBe(1);
	});
	
	test('should handle clearing specific events', () => {
		const world = new World<TestComponents, TestEvents>();
		const eventBus = world.getEventBus();
		
		let count1 = 0, count2 = 0;
		
		// Subscribe to multiple events
		eventBus.subscribe('entityCreated', () => { count1++; });
		eventBus.subscribe('entityDestroyed', () => { count2++; });
		
		// Clear only entityCreated events
		eventBus.clearEvent('entityCreated');
		
		// Publish events
		eventBus.publish('entityCreated', { entityId: 1 });
		eventBus.publish('entityDestroyed', { entityId: 2 });
		
		// Only entityDestroyed should have been received
		expect(count1).toBe(0);
		expect(count2).toBe(1);
	});
	
	test('should auto-register event handlers from systems', () => {
		const world = new World<TestComponents, TestEvents>();
		
		// Create a test entity
		const entityId = world.createEntity();
		world.addComponent(entityId, 'health', { value: 100 });
		
		// Create a system with event handlers
		const receivedEvents: any[] = [];
		
		world.addSystem({
			label: 'HealthEventSystem',
			with: ['health'] as const,
			eventHandlers: {
				healthChanged: {
					handler: (data, eventBus, entityManager) => {
						receivedEvents.push(data);
					}
				},
				entityDestroyed: {
					handler: (data, eventBus, entityManager) => {
						receivedEvents.push(data);
					}
				}
			}
		});
		
		// Publish events
		world.getEventBus().publish('healthChanged', { 
			entityId, 
			oldValue: 100, 
			newValue: 80 
		});
		
		world.getEventBus().publish('entityDestroyed', { 
			entityId 
		});
		
		// Check if system received the events
		expect(receivedEvents.length).toBe(2);
		expect(receivedEvents[0]).toEqual({ 
			entityId, 
			oldValue: 100, 
			newValue: 80 
		});
		expect(receivedEvents[1]).toEqual({ 
			entityId 
		});
	});
	
	test('should provide eventBus and entityManager parameters to event handlers', () => {
		const world = new World<TestComponents, TestEvents>();
		const eventBus = world.getEventBus();
		
		// Create test entity
		const entityId = world.createEntity();
		world.addComponent(entityId, 'health', { value: 100 });
		
		// Track function parameters
		let receivedEventBus: any = null;
		let receivedEntityManager: any = null;
		let receivedData: any = null;
		
		// Add system with an event handler that will receive the parameters
		world.addSystem({
			label: 'ParameterTestSystem',
			eventHandlers: {
				healthChanged: {
					handler: (data, eventBus, entityManager) => {
						receivedData = data;
						receivedEventBus = eventBus;
						receivedEntityManager = entityManager;
						
						// Use the entityManager to modify the entity's health
						const health = entityManager.getComponent(data.entityId, 'health');
						if (health) {
							entityManager.addComponent(data.entityId, 'health', { 
								value: data.newValue 
							});
						}
						
						// Use the eventBus to publish a follow-up event
						eventBus.publish('gameStateChanged', {
							oldState: 'normal',
							newState: data.newValue < 50 ? 'danger' : 'normal'
						});
					}
				}
			}
		});
		
		// Also track the follow-up event
		let gameStateChanged = false;
		let gameStateData: any = null;
		
		eventBus.subscribe('gameStateChanged', (data) => {
			gameStateChanged = true;
			gameStateData = data;
		});
		
		// Trigger the event
		eventBus.publish('healthChanged', {
			entityId,
			oldValue: 100,
			newValue: 40
		});
		
		// Verify our handler received the parameters
		expect(receivedData).toEqual({
			entityId,
			oldValue: 100,
			newValue: 40
		});
		
		// Verify we received the event bus and entity manager
		expect(receivedEventBus).toBeTruthy();
		expect(receivedEntityManager).toBeTruthy();
		
		// Verify the entity was modified by the handler
		const updatedHealth = world.getComponent(entityId, 'health');
		expect(updatedHealth?.value).toBe(40);
		
		// Verify the follow-up event was published
		expect(gameStateChanged).toBe(true);
		expect(gameStateData).toEqual({
			oldState: 'normal',
			newState: 'danger'
		});
	});
	
	test('should handle event handlers during system lifecycle', () => {
		const world = new World<TestComponents, TestEvents>();
		const eventBus = world.getEventBus();
		
		let attachCalled = false;
		let detachCalled = false;
		let eventReceived = false;
		
		// Track the subscriptions and unsubscribe functions
		const subscriptions: (() => void)[] = [];
		
		// Add a system with lifecycle hooks and event handlers
		world.addSystem({
			label: 'LifecycleSystem',
			onAttach: (eb) => {
				attachCalled = true;
				// Verify the provided event bus is the same instance
				expect(eb).toBe(eventBus);
				
				// Manually subscribe to ensure we can test proper cleanup
				subscriptions.push(
					eb.subscribe('entityCreated', () => {
						eventReceived = true;
					})
				);
			},
			onDetach: (eb) => {
				detachCalled = true;
				// Verify the provided event bus is the same instance
				expect(eb).toBe(eventBus);
				
				// Manually clean up subscriptions
				subscriptions.forEach(unsub => unsub());
			},
			// No event handlers here - we're manually subscribing in onAttach
		});
		
		// Verify attach was called
		expect(attachCalled).toBe(true);
		
		// Publish an event
		eventBus.publish('entityCreated', { entityId: 1 });
		
		// Verify event was received
		expect(eventReceived).toBe(true);
		
		// Remove the system
		world.removeSystem('LifecycleSystem');
		
		// Verify detach was called
		expect(detachCalled).toBe(true);
		
		// Reset flag and publish again
		eventReceived = false;
		eventBus.publish('entityCreated', { entityId: 2 });
		
		// Event should not be received after system removal
		expect(eventReceived).toBe(false);
	});
	
	test('should integrate event system with ECS for event-driven behavior', () => {
		const world = new World<TestComponents, TestEvents>();
		const eventBus = world.getEventBus();
		
		// Create a test entity
		const entityId = world.createEntity();
		world.addComponent(entityId, 'health', { value: 100 });
		world.addComponent(entityId, 'position', { x: 0, y: 0 });
		
		// Create a second entity for collisions
		const entity2Id = world.createEntity();
		world.addComponent(entity2Id, 'health', { value: 100 });
		world.addComponent(entity2Id, 'position', { x: 10, y: 0 });
		
		// Track movement actions separately for each entity
		const movementActions: Record<number, any[]> = {
			[entityId]: [],
			[entity2Id]: []
		};
		
		// Create a damage system that reacts to collision events
		world.addSystem({
			label: 'EventDrivenDamageSystem',
			eventHandlers: {
				collision: {
					handler: (data, eventBus, entityManager) => {
						// Apply damage to both entities
						const entities = [data.entity1Id, data.entity2Id];
						
						for (const id of entities) {
							// Safely check if entity exists before getting component
							try {
								const health = entityManager.getComponent(id, 'health');
								if (health) {
									const oldValue = health.value;
									const newValue = Math.max(0, oldValue - 10);
									
									// Update health
									entityManager.addComponent(id, 'health', { value: newValue });
									
									// Publish health changed event
									eventBus.publish('healthChanged', {
										entityId: id,
										oldValue,
										newValue
									});
								}
							} catch (error) {
								// Entity doesn't exist, ignore it
							}
						}
					}
				}
			}
		});
		
		// Create a movement system that reacts to health changes
		world.addSystem({
			label: 'HealthReactiveMovementSystem',
			with: ['position'] as const,
			eventHandlers: {
				healthChanged: {
					handler: (data, eventBus, entityManager) => {
						try {
							const position = entityManager.getComponent(data.entityId, 'position');
							if (position) {
								// When health changes, move the entity away from the origin
								const direction = data.newValue < 50 ? 10 : 1;
								
								const newPosition = {
									x: position.x + direction,
									y: position.y + direction
								};
								
								entityManager.addComponent(data.entityId, 'position', newPosition);
								
								// Initialize the array if it doesn't exist
								if (!movementActions[data.entityId]) {
									movementActions[data.entityId] = [];
								}
								
								// Now TypeScript knows it's safe to access
								const actionsArray = movementActions[data.entityId]!;
								actionsArray.push({
									newPosition
								});
							}
						} catch (error) {
							// Entity doesn't exist, ignore it
						}
					}
				}
			},
			// Regular process method continues to run
			process(entities, deltaTime, entityManager, eventBus) {
				// This could update entities based on non-event logic
			}
		});
		
		// Trigger the cascade of events with real entities
		eventBus.publish('collision', {
			entity1Id: entityId,
			entity2Id: entity2Id
		});
		
		// Verify health was updated
		const updatedHealth = world.getComponent(entityId, 'health');
		expect(updatedHealth?.value).toBe(90);
		
		// Verify position was updated in response to health change
		const updatedPosition = world.getComponent(entityId, 'position');
		expect(updatedPosition).toEqual({ x: 1, y: 1 });
		
		// Verify movement action was recorded
		// Ensure we have an array to avoid TypeScript errors
		expect(Array.isArray(movementActions[entityId])).toBe(true);
		const entityActions = movementActions[entityId] || [];
		expect(entityActions.length).toBe(1);
		expect(entityActions[0].newPosition).toEqual({ x: 1, y: 1 });
		
		// Verify second entity was also updated
		const updatedHealth2 = world.getComponent(entity2Id, 'health');
		expect(updatedHealth2?.value).toBe(90);
		
		// Trigger additional collision to reduce health below 50
		for (let i = 0; i < 5; i++) {
			eventBus.publish('collision', {
				entity1Id: entityId,
				entity2Id: entity2Id
			});
		}
		
		// Health should now be below 50
		const finalHealth = world.getComponent(entityId, 'health');
		expect(finalHealth?.value).toBe(40);
		
		// The last movement should have used the larger direction value
		const finalPosition = world.getComponent(entityId, 'position');
		expect(finalPosition?.x).toBeGreaterThan(5); // Multiple movements with larger steps
		
		// Verify the last movement action used direction 10
		const entityMovements = movementActions[entityId] || [];
		// Ensure we have enough movements to compare
		expect(entityMovements.length).toBeGreaterThan(1);
		const lastMovement = entityMovements[entityMovements.length - 1];
		const secondLastMovement = entityMovements[entityMovements.length - 2];
		
		// Verify that at some point we switched to the larger step size
		expect(lastMovement.newPosition.x).toBe(
			secondLastMovement.newPosition.x + 10
		);
	});
});
