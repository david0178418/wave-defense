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

describe('Resource System', () => {
	test('should add and retrieve resources', () => {
		const world = new SimpleECS<TestComponents, TestEvents, TestResources>();
		
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
		const world = new SimpleECS<TestComponents, TestEvents, TestResources>();
		
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
		const world = new SimpleECS<TestComponents, TestEvents, TestResources>();
		
		expect(() => world.getResource('config')).toThrow('Resource config not found');
	});
	
	test('should allow accessing ResourceManager directly', () => {
		const { resourceManager } = new SimpleECS<TestComponents, TestEvents, TestResources>();
		
		resourceManager.add('config', { debug: true, timeStep: 1/60 });
		
		const config = resourceManager.get('config');
		
		expect(config).toEqual({ debug: true, timeStep: 1/60 });
	});
	
	test('should provide resources to systems', () => {
		const world = new SimpleECS<TestComponents, TestEvents, TestResources>();
		
		world.addResource('config', { debug: true, timeStep: 1/60 });
		world.addResource('gameState', { current: 'game', score: 100 });
		
		const entityId = world.createEntity();
		world.addComponent(entityId, 'position', { x: 0, y: 0 });
		
		const processedEntities: any[] = [];
		const accessedResources: Record<string, any> = {};
		
		world.addSystem(
			createSystem<TestComponents>('resource-system')
			.addQuery('entities', {
				with: ['position'],
			})
			.setProcess(({entities}, deltaTime, entityManager, resourceManager, eventBus) => {
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
			})
			.build()
		);
		
		world.update(1);
		
		expect(accessedResources['config']).toEqual({ debug: true, timeStep: 1/60 });
		expect(accessedResources['gameState'].current).toBe('game');
		
		const position = world.getComponent(entityId, 'position');
		expect(position?.x).toBeCloseTo(10 * (1/60));
		
		const gameState = world.getResource('gameState');
		expect(gameState.score).toBe(101);
	});
	
	test('should handle resources in system lifecycle hooks', () => {
		const world = new SimpleECS<TestComponents, TestEvents, TestResources>();
		
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
		const world = new SimpleECS<TestComponents, TestEvents, TestResources>();
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
