import { expect, describe, test } from 'bun:test';
import SimpleECS from './simple-ecs';
import { createBundle } from './bundle';
import { createSystem } from './system-builder';

interface TestComponents {
	position: { x: number; y: number };
}

interface TestEvents {
	collision: { entity1Id: number; entity2Id: number };
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

describe('ResourceManager', () => {
	test('should add and get resources', () => {
		const resourceManager = new SimpleECS<TestComponents, TestEvents, TestResources>().resourceManager;
		
		// Add a resource
		resourceManager.add('config', { debug: true, timeStep: 1/60 });
		
		// Get the resource
		const config = resourceManager.get('config');
		
		// Check that we got the expected value
		expect(config).toEqual({ debug: true, timeStep: 1/60 });
	});
	
	test('should check if a resource exists', () => {
		const resourceManager = new SimpleECS<TestComponents, TestEvents, TestResources>().resourceManager;
		
		// Add a resource
		resourceManager.add('config', { debug: true, timeStep: 1/60 });
		
		// Check if resources exist
		expect(resourceManager.has('config')).toBe(true);
		expect(resourceManager.has('nonExistent' as keyof TestResources)).toBe(false);
	});
	
	test('should remove resources', () => {
		const resourceManager = new SimpleECS<TestComponents, TestEvents, TestResources>().resourceManager;
		
		// Add a resource
		resourceManager.add('config', { debug: true, timeStep: 1/60 });
		
		// Remove the resource
		const removed = resourceManager.remove('config');
		
		// Check that the resource was removed
		expect(removed).toBe(true);
		expect(resourceManager.has('config')).toBe(false);
	});
	
	test('should gracefully handle removing non-existent resources', () => {
		const resourceManager = new SimpleECS<TestComponents, TestEvents, TestResources>().resourceManager;
		
		// Try to remove a non-existent resource
		const removed = resourceManager.remove('nonExistent' as keyof TestResources);
		
		// Should return false and not throw
		expect(removed).toBe(false);
	});
	
	test('should handle resources in ECS systems', () => {
		const world = new SimpleECS<TestComponents, TestEvents, TestResources>();
		
		// Create an entity to work with
		const entity = world.createEntity();
		world.addComponent(entity.id, 'position', { x: 0, y: 0 });
		
		// Create a bundle with resources and a system
		const bundle = createBundle<TestComponents, TestEvents, TestResources>()
			.addResource('config', { debug: true, timeStep: 1/60 })
			.addResource('gameState', { current: 'playing', score: 0 })
			.addSystem(
				createSystem<TestComponents, TestEvents, TestResources>('ConfigAwareSystem')
					.addQuery('entities', {
						with: ['position']
					})
					.setProcess((queries, deltaTime, entityManager, resourceManager) => {
						// Get resources
						const config = resourceManager.get('config');
						const gameState = resourceManager.get('gameState');
						
						// Use resources to update entities
						for (const entity of queries.entities) {
							// Move entity based on config timeStep
							const position = entity.components.position;
							position.x += 10 * (config?.timeStep || 0);
							
							// Update game state
							if (gameState) {
								gameState.score += 1;
							}
						}
					})
			);
		
		// Install the bundle
		world.install(bundle);
		
		// Update the world to run the system
		world.update(1);
		
		// Verify entity was updated with resource-driven logic
		const position = world.getComponent(entity.id, 'position');
		expect(position).toEqual({ x: 10 * (1/60), y: 0 });
		
		// Verify resource was updated by the system
		const gameState = world.resourceManager.get('gameState');
		expect(gameState).toEqual({ current: 'playing', score: 1 });
	});
	
	test('should support object and function resources', () => {
		const world = new SimpleECS<TestComponents, TestEvents, TestResources>();
		
		// Add a logger resource with a function
		let logMessage = '';
		
		// Create a bundle with the logger resource
		const bundle = createBundle<TestComponents, TestEvents, TestResources>()
			.addResource('logger', { 
				log: (message: string) => {
					logMessage = message;
				}
			})
			.addSystem(
				createSystem<TestComponents, TestEvents, TestResources>('LoggingSystem')
					.setProcess((_, __, ___, resourceManager) => {
						// Use the logger resource
						const logger = resourceManager.get('logger');
						logger?.log('System executed');
					})
			);
		
		// Install the bundle
		world.install(bundle);
		
		// Update the world to run the system
		world.update(1);
		
		// Check that the logger function was called
		expect(logMessage).toBe('System executed');
	});
	
	test('should support resources in event handlers', () => {
		const world = new SimpleECS<TestComponents, TestEvents, TestResources>();
		
		// Add resources to test with
		let resourceUsed = false;
		
		// Create a bundle with resources and a system with event handlers
		const bundle = createBundle<TestComponents, TestEvents, TestResources>()
			.addResource('config', { debug: true, timeStep: 1/60 })
			.addSystem(
				createSystem<TestComponents, TestEvents, TestResources>('ResourceUsingEventSystem')
					.setEventHandlers({
						collision: {
							handler: (data, entityManager, resourceManager, eventBus) => {
								// Access and use resources in event handler
								const config = resourceManager.get('config');
								if (config?.debug) {
									resourceUsed = true;
								}
							}
						}
					})
			);
		
		// Install the bundle
		world.install(bundle);
		
		// Publish an event to trigger the handler
		world.eventBus.publish('collision', { 
			entity1Id: 1, 
			entity2Id: 2 
		});
		
		// Verify the resource was used in the event handler
		expect(resourceUsed).toBe(true);
	});
});
