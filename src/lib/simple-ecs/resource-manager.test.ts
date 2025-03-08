import { expect, describe, test } from 'bun:test';
import SimpleECS from './simple-ecs';
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
		
		// Add resources
		world.addResource('config', { debug: true, timeStep: 1/60 });
		world.addResource('gameState', { current: 'game', score: 0 });
		
		// Create an entity
		const entity = world.createEntity();
		world.addComponent(entity.id, 'position', { x: 0, y: 0 });
		
		const processedEntities: any[] = [];
		const accessedResources: Record<string, any> = {};
		
		world.addSystem(
			createSystem<TestComponents>('resource-system')
			.addQuery('entities', {
				with: ['position'],
			})
			.setProcess((queries, deltaTime, entityManager, resourceManager, eventBus) => {
				processedEntities.push(...queries.entities);
				
				accessedResources['config'] = resourceManager.get('config');
				accessedResources['gameState'] = resourceManager.get('gameState');
				
				if (accessedResources['config'].debug) {
					for (const entity of queries.entities) {
						entity.components.position.x += 10 * accessedResources['config'].timeStep;
						
						const gameState = resourceManager.get('gameState');
						gameState.score += 1;
					}
				}
			})
		);
		
		world.update(1);
		
		expect(accessedResources['config']).toEqual({ debug: true, timeStep: 1/60 });
		expect(accessedResources['gameState'].current).toBe('game');
		
		// The position should have been updated
		expect(world.getComponent(entity.id, 'position')?.x).toBeCloseTo(10 * (1/60));
		
		// The score should have been incremented
		expect(world.getResource('gameState').score).toBe(1);
	});
	
	test('should support object and function resources', () => {
		const world = new SimpleECS<TestComponents, TestEvents, TestResources>();
		
		// Add a logger resource with a function
		let logMessage = '';
		world.addResource('logger', {
			log(message: string) {
				logMessage = message;
			}
		});
		
		// Add a system that uses the logger
		world.addSystem(
			createSystem<TestComponents>('logger-system')
			.setProcess((queries, deltaTime, entityManager, resourceManager) => {
				const logger = resourceManager.get('logger');
				logger.log('System executed');
			})
		);
		
		world.update(1);
		
		expect(logMessage).toBe('System executed');
	});
	
	test('should support resources in event handlers', () => {
		const world = new SimpleECS<TestComponents, TestEvents, TestResources>();
		
		// Add resources
		world.addResource('gameState', { current: 'game', score: 0 });
		
		// Add a system with an event handler that uses resources
		world.addSystem(
			createSystem<TestComponents>('event-resource-system')
			.setEventHandlers({
				collision: {
					handler(
						data,
						entityManager,
						resourceManager,
						eventBus,
					) {
						const gameState = resourceManager.get('gameState');
						gameState.score += 10;
					}
				}
			})
		);
		
		// Trigger the event
		world.eventBus.publish('collision', { entity1Id: 1, entity2Id: 2 });
		
		// Check that the resource was updated by the event handler
		expect(world.getResource('gameState').score).toBe(10);
	});
});
