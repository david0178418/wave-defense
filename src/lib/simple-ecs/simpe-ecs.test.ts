import { expect, describe, test } from 'bun:test';
import { World } from '.';

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

interface TestEvents {
	entityCreated: { entityId: number };
	entityDestroyed: { entityId: number };
	componentAdded: { entityId: number; componentName: string };
	componentRemoved: { entityId: number; componentName: string };
	collision: { entity1Id: number; entity2Id: number };
	healthChanged: { entityId: number; oldValue: number; newValue: number };
	gameStateChanged: { oldState: string; newState: string };
}

interface TestResources {
	config: { 
		debug: boolean; 
		timeStep: number 
	};
	gameState: { 
		current: string; 
		score: number 
	};
	logger: { 
		log(message: string): void 
	};
}

describe('World', () => {
	test('should create a new entities and increment ids', () => {
		const world = new World<TestComponents>();
		const entityId = world.createEntity();
		
		expect(entityId).toBe(1);
		
		const secondEntityId = world.createEntity();
		expect(secondEntityId).toBe(2);
	});
	
	test('should add components to entities', () => {
		const world = new World<TestComponents>();
		const entityId = world.createEntity();
		
		world.addComponent(entityId, 'position', { x: 10, y: 20 });
		
		const position = world.getComponent(entityId, 'position');
		expect(position).toEqual({ x: 10, y: 20 });
	});
	
	test('should remove components from entities', () => {
		const world = new World<TestComponents>();
		const entityId = world.createEntity();
		
		world.addComponent(entityId, 'position', { x: 10, y: 20 });
		
		world.removeComponent(entityId, 'position');
		
		const position = world.getComponent(entityId, 'position');
		expect(position).toBeNull();
	});
	
	test('should remove entities', () => {
		const world = new World<TestComponents>();
		const entityId = world.createEntity();
		
		world.addComponent(entityId, 'position', { x: 10, y: 20 });
		world.addComponent(entityId, 'health', { value: 100 });
		
		const result = world.removeEntity(entityId);

		expect(result).toBe(true);
		expect(() => world.getComponent(entityId, 'position')).toThrow();
	});
	
	test('should process systems with the correct entities', () => {
		const world = new World<TestComponents>();
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
		
		world.addSystem({
			label: 'MovementSystem',
			with: ['position', 'velocity'] as const,
			without: ['health'] as const,
			process(entities) {
				for (const entity of entities) {
					processedEntities.push(entity.id);

					// In a real system, we'd update position based on velocity and deltaTime
				}
			}
		});
		
		world.update(1/60);
		
		expect(processedEntities).toEqual([entity1]);
	});
	
	test('should allow systems to modify entities', () => {
		const world = new World<TestComponents>();
		
		const entity1 = world.createEntity();
		world.addComponent(entity1, 'position', { x: 10, y: 20 });
		world.addComponent(entity1, 'velocity', { x: 5, y: 10 });
		
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
		
		world.update(1.0);
		
		const updatedPosition = world.getComponent(entity1, 'position');
		expect(updatedPosition).toEqual({ x: 15, y: 30 });
	});
	
	test('should throw when accessing components of non-existent entities', () => {
		const world = new World<TestComponents>();
		
		expect(() => world.getComponent(999, 'position')).toThrow();
		expect(() => world.addComponent(999, 'position', { x: 10, y: 20 })).toThrow();
		expect(() => world.removeComponent(999, 'position')).toThrow();
	});
	
	test('should return null for non-existent components', () => {
		const world = new World<TestComponents>();
		const entityId = world.createEntity();
		const health = world.getComponent(entityId, 'health');

		expect(health).toBeNull();
	});
	
	test('should return false when removing non-existent entity', () => {
		const world = new World<TestComponents>();
		const result = world.removeEntity(999);
		
		expect(result).toBe(false);
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
		const eventBus = world.eventBus;
		const entityId = world.createEntity();
		
		world.addComponent(entityId, 'position', { x: 0, y: 0 });
		
		let eventReceived = false;
		let receivedData: TestEvents['entityCreated'] = { entityId: 0 };
		
		eventBus.subscribe('entityCreated', (data) => {
			eventReceived = true;
			receivedData = data;
		});
		
		eventBus.publish('entityCreated', { entityId: 123 });
		
		expect(eventReceived).toBe(true);
		expect(receivedData).toEqual({ entityId: 123 });
	});
	
	test('should handle one-time event subscriptions', () => {
		const { eventBus } = new World<TestComponents, TestEvents>();
		let normalEventCount = 0;
		let onceEventCount = 0;
		
		eventBus.subscribe('entityCreated', () => {
			normalEventCount++;
		});
		
		eventBus.once('entityCreated', () => {
			onceEventCount++;
		});
		
		eventBus.publish('entityCreated', { entityId: 1 });
		eventBus.publish('entityCreated', { entityId: 2 });
		eventBus.publish('entityCreated', { entityId: 3 });
		
		expect(normalEventCount).toBe(3);
		expect(onceEventCount).toBe(1);
	});
	
	test('should handle unsubscribing from events', () => {
		const { eventBus } = new World<TestComponents, TestEvents>();
		let eventCount = 0;
		
		const unsubscribe = eventBus.subscribe('entityCreated', () => {
			eventCount++;
		});
		
		eventBus.publish('entityCreated', { entityId: 1 });
		expect(eventCount).toBe(1);
		
		unsubscribe();
		eventBus.publish('entityCreated', { entityId: 2 });
		
		expect(eventCount).toBe(1);
	});
	
	test('should handle clearing all events', () => {
		const { eventBus } = new World<TestComponents, TestEvents>();
		let count1 = 0;
		let count2 = 0;
		
		eventBus.subscribe('entityCreated', () => { count1++; });
		eventBus.subscribe('entityDestroyed', () => { count2++; });
		eventBus.publish('entityCreated', { entityId: 1 });
		eventBus.publish('entityDestroyed', { entityId: 2 });
		
		expect(count1).toBe(1);
		expect(count2).toBe(1);
		
		eventBus.clear();
		eventBus.publish('entityCreated', { entityId: 3 });
		eventBus.publish('entityDestroyed', { entityId: 4 });
		
		expect(count1).toBe(1);
		expect(count2).toBe(1);
	});
	
	test('should handle clearing specific events', () => {
		const { eventBus } = new World<TestComponents, TestEvents>();
		let count1 = 0;
		let count2 = 0;
		
		eventBus.subscribe('entityCreated', () => { count1++; });
		eventBus.subscribe('entityDestroyed', () => { count2++; });
		eventBus.clearEvent('entityCreated');
		eventBus.publish('entityCreated', { entityId: 1 });
		eventBus.publish('entityDestroyed', { entityId: 2 });
		
		// Only entityDestroyed should have been received
		expect(count1).toBe(0);
		expect(count2).toBe(1);
	});
	
	test('should auto-register event handlers from systems', () => {
		const world = new World<TestComponents, TestEvents>();
		const entityId = world.createEntity();
		
		world.addComponent(entityId, 'health', { value: 100 });
		
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
		
		world.eventBus.publish('healthChanged', { 
			entityId, 
			oldValue: 100, 
			newValue: 80 
		});
		
		world.eventBus.publish('entityDestroyed', { 
			entityId 
		});
		
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
		const eventBus = world.eventBus;
		const entityId = world.createEntity();
		
		world.addComponent(entityId, 'health', { value: 100 });
		
		let receivedEventBus: any = null;
		let receivedEntityManager: any = null;
		let receivedData: any = null;
		
		// Add system with an event handler that will receive the parameters
		world.addSystem({
			label: 'ParameterTestSystem',
			eventHandlers: {
				healthChanged: {
					handler(
						data,
						entityManager,
						resourceManager,
						eventBus,
					) {
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
		
		let gameStateChanged = false;
		let gameStateData: any = null;
		
		eventBus.subscribe('gameStateChanged', (data) => {
			gameStateChanged = true;
			gameStateData = data;
		});
		
		eventBus.publish('healthChanged', {
			entityId,
			oldValue: 100,
			newValue: 40
		});
		
		expect(receivedData).toEqual({
			entityId,
			oldValue: 100,
			newValue: 40
		});
		expect(receivedEventBus).toBeTruthy();
		expect(receivedEntityManager).toBeTruthy();
		
		const updatedHealth = world.getComponent(entityId, 'health');

		expect(updatedHealth?.value).toBe(40);
		expect(gameStateChanged).toBe(true);
		expect(gameStateData).toEqual({
			oldState: 'normal',
			newState: 'danger'
		});
	});
	
	test('should handle event handlers during system lifecycle', () => {
		const world = new World<TestComponents, TestEvents>();
		const eventBus = world.eventBus;
		
		let attachCalled = false;
		let detachCalled = false;
		let eventReceived = false;
		
		// Track the subscriptions and unsubscribe functions
		const subscriptions: (() => void)[] = [];
		
		// Add a system with lifecycle hooks and event handlers
		world.addSystem({
			label: 'LifecycleSystem',
			onAttach(
				entityManager,
				resourceManager,
				innerEventBus,
			) {
				attachCalled = true;
				
				expect(innerEventBus).toBe(eventBus);
				
				subscriptions.push(
					innerEventBus.subscribe('entityCreated', () => {
						eventReceived = true;
					})
				);
			},
			onDetach(
				entityManager,
				resourceManager,
				innerEventBus,
			) {
				detachCalled = true;
				
				expect(innerEventBus).toBe(eventBus);
				
				subscriptions.forEach(unsub => unsub());
			},
			// No event handlers here - we're manually subscribing in onAttach
		});
		
		expect(attachCalled).toBe(true);
		
		eventBus.publish('entityCreated', { entityId: 1 });
		
		expect(eventReceived).toBe(true);
		
		world.removeSystem('LifecycleSystem');
		
		expect(detachCalled).toBe(true);
		
		eventReceived = false;
		eventBus.publish('entityCreated', { entityId: 2 });
		
		expect(eventReceived).toBe(false);
	});
	
	test('should integrate event system with ECS for event-driven behavior', () => {
		const world = new World<TestComponents, TestEvents>();
		const eventBus = world.eventBus;
		const entityId = world.createEntity();
		
		world.addComponent(entityId, 'health', { value: 100 });
		world.addComponent(entityId, 'position', { x: 0, y: 0 });
		
		const entity2Id = world.createEntity();
		
		world.addComponent(entity2Id, 'health', { value: 100 });
		world.addComponent(entity2Id, 'position', { x: 10, y: 0 });
		
		const movementActions: Record<number, any[]> = {
			[entityId]: [],
			[entity2Id]: []
		};
		
		world.addSystem({
			label: 'EventDrivenDamageSystem',
			eventHandlers: {
				collision: {
					handler(
						data,
						entityManager
					) {
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
					handler(
						data,
						entityManager,
						eventBus,
					) {
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

describe('Resource System', () => {
	test('should add and retrieve resources', () => {
		const world = new World<TestComponents, TestEvents, TestResources>();
		
		world.addResource('config', { debug: true, timeStep: 1/60 });
		world.addResource('gameState', { current: 'menu', score: 0 });
		
		const config = world.getResource('config');
		const gameState = world.getResource('gameState');
		
		expect(config).toEqual({ debug: true, timeStep: 1/60 });
		expect(gameState).toEqual({ current: 'menu', score: 0 });
		
		// Type inference works (this is just a compilation check)
		// Using void to prevent "unused variable" warnings while still testing type inference
		void config.debug;
		void config.timeStep;
		void gameState.current;
		void gameState.score;
	});
	
	test('should check existence and remove resources', () => {
		const world = new World<TestComponents, TestEvents, TestResources>();
		
		world.addResource('config', { debug: true, timeStep: 1/60 });
		
		expect(world.hasResource('config')).toBe(true);
		expect(world.hasResource('nonExistent')).toBe(false);
		
		const removed = world.removeResource('config');
		expect(removed).toBe(true);
		
		expect(world.hasResource('config')).toBe(false);
		
		const removedNonExistent = world.removeResource('nonExistent');
		expect(removedNonExistent).toBe(false);
	});
	
	test('should throw error when getting uninitialized resource', () => {
		const world = new World<TestComponents, TestEvents, TestResources>();
		
		expect(() => world.getResource('config')).toThrow('Resource config not found');
	});
	
	test('should allow accessing ResourceManager directly', () => {
		const { resourceManager } = new World<TestComponents, TestEvents, TestResources>();
		
		resourceManager.add('config', { debug: true, timeStep: 1/60 });
		
		const config = resourceManager.get('config');
		
		expect(config).toEqual({ debug: true, timeStep: 1/60 });
	});
	
	test('should provide resources to systems', () => {
		const world = new World<TestComponents, TestEvents, TestResources>();
		
		world.addResource('config', { debug: true, timeStep: 1/60 });
		world.addResource('gameState', { current: 'game', score: 100 });
		
		const entityId = world.createEntity();
		world.addComponent(entityId, 'position', { x: 0, y: 0 });
		
		const processedEntities: any[] = [];
		const accessedResources: Record<string, any> = {};
		
		world.addSystem({
			label: 'resourceSystem',
			with: ['position'],
			process(
				entities,
				deltaTime,
				entityManager,
				resourceManager,
				eventBus,
			) {
				processedEntities.push(...entities);
				
				accessedResources['config'] = resourceManager.get('config');
				accessedResources['gameState'] = resourceManager.get('gameState');
				
				if (accessedResources['config'].debug) {
					for (const entity of entities) {
						entity.components.position.x += 10 * accessedResources['config'].timeStep;
						
						const gameState = resourceManager.get('gameState');
						gameState.score += 1;
					}
				}
			}
		});
		
		world.update(1);
		
		expect(accessedResources['config']).toEqual({ debug: true, timeStep: 1/60 });
		expect(accessedResources['gameState'].current).toBe('game');
		
		const position = world.getComponent(entityId, 'position');
		expect(position?.x).toBeCloseTo(10 * (1/60));
		
		const gameState = world.getResource('gameState');
		expect(gameState.score).toBe(101);
	});
	
	test('should handle resources in system lifecycle hooks', () => {
		const world = new World<TestComponents, TestEvents, TestResources>();
		
		world.addResource('config', { debug: true, timeStep: 1/60 });
		
		const lifecycleAccess: Record<string, any> = {
			onAttach: null,
			onDetach: null
		};
		
		world.addSystem({
			label: 'lifecycleSystem',
			onAttach: (eventBus, resourceManager) => {
				lifecycleAccess['onAttach'] = resourceManager.get('config');
			},
			onDetach: (eventBus, resourceManager) => {
				lifecycleAccess['onDetach'] = resourceManager.get('config');
			},
			process: () => {}
		});
		
		expect(lifecycleAccess['onAttach']).toEqual({ debug: true, timeStep: 1/60 });
		
		world.removeSystem('lifecycleSystem');
		
		expect(lifecycleAccess['onDetach']).toEqual({ debug: true, timeStep: 1/60 });
	});
	
	test('should provide resources to event handlers', () => {
		const world = new World<TestComponents, TestEvents, TestResources>();
		const eventBus = world.eventBus;
		
		world.addResource('config', { debug: true, timeStep: 1/60 });
		world.addResource('gameState', { current: 'game', score: 0 });
		
		const handlerResources: Record<string, any> = {};
		
		world.addSystem({
			label: 'eventResourceSystem',
			eventHandlers: {
				collision: {
					handler(
						data,
						entityManager,
						resourceManager,
						eventBus,
					) {
						handlerResources['config'] = resourceManager.get('config');
						handlerResources['gameState'] = resourceManager.get('gameState');
						
						if (resourceManager.get('config').debug) {
							const gameState = resourceManager.get('gameState');
							gameState.score += 10;
						}
					}
				}
			},
			process: () => {}
		});
		
		eventBus.publish('collision', { 
			entity1Id: 1, 
			entity2Id: 2 
		});
		
		expect(handlerResources['config']).toEqual({ debug: true, timeStep: 1/60 });
		expect(handlerResources['gameState'].current).toBe('game');
		
		const gameState = world.getResource('gameState');
		expect(gameState.score).toBe(10);
	});
});
