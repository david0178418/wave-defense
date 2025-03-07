import { expect, describe, test } from 'bun:test';
import SimpleECS from './simple-ecs';

interface TestComponents {
	position: { x: number; y: number };
	health: { value: number };
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

describe('EventSystem', () => {
	test('should allow subscribing to and publishing events', () => {
		const world = new SimpleECS<TestComponents, TestEvents>();
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
		const { eventBus } = new SimpleECS<TestComponents, TestEvents>();
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
		const { eventBus } = new SimpleECS<TestComponents, TestEvents>();
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
		const { eventBus } = new SimpleECS<TestComponents, TestEvents>();
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
		const { eventBus } = new SimpleECS<TestComponents, TestEvents>();
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
		const world = new SimpleECS<TestComponents, TestEvents>();
		const entityId = world.createEntity();
		
		world.addComponent(entityId, 'health', { value: 100 });
		
		const receivedEvents: any[] = [];
		
		world.addSystem({
			label: 'HealthEventSystem',
			with: ['health'],
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
		const world = new SimpleECS<TestComponents, TestEvents>();
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
		const world = new SimpleECS<TestComponents, TestEvents>();
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
		const world = new SimpleECS<TestComponents, TestEvents>();
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
			with: ['position'],
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
