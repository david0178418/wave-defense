import { expect, describe, test, spyOn } from 'bun:test';
import SimpleECS from './simple-ecs';
import Bundle, { createBundle, combineBundle } from './bundle';
import { SystemBuilder } from './system-builder';

// Define test component and resource types
interface PositionComponents {
	position: { x: number; y: number };
	velocity: { x: number; y: number };
}

interface PositionResources {
	gravity: { value: number };
}

interface PlayerComponents {
	player: { id: string };
	health: { value: number };
}

interface PlayerResources {
	playerControls: { up: boolean; down: boolean; left: boolean; right: boolean };
}

// Combined types
type GameComponents = PositionComponents & PlayerComponents;
type GameResources = PositionResources & PlayerResources;

describe('Bundle', () => {
	test('should create a bundle with correct type parameters', () => {
		const bundle = createBundle<PositionComponents, {}, PositionResources>();
		expect(bundle).toBeInstanceOf(Bundle);
	});

	test('should add systems to the bundle', () => {
		const bundle = createBundle<PositionComponents, {}, PositionResources>();
		const system = bundle.createSystem('test');
		bundle.addSystem(system);
		
		// This is a simplification - in a real-world scenario we would have a getter
		// to access the systems array, or we would test the system by installing the bundle
		// and checking if the system was added to the world
		const bundleAny = bundle as any;
		expect(bundleAny._systems.length).toBe(1);
		expect(bundleAny._systems[0].label).toBe('test');
	});

	test('should add resources to the bundle', () => {
		const bundle = createBundle<PositionComponents, {}, PositionResources>();
		bundle.addResource('gravity', { value: 9.8 });
		
		// Similar to the systems test, we're accessing private fields for testing
		const bundleAny = bundle as any;
		expect(bundleAny._resources.size).toBe(1);
		expect(bundleAny._resources.get('gravity')).toEqual({ value: 9.8 });
	});

	test('should install a bundle into a SimpleECS instance', () => {
		// Create a world and spy on its methods
		const world = new SimpleECS<PositionComponents, {}, PositionResources>();
		
		// Create the system builder directly
		const systemBuilder = world.createSystem('movement')
			.addQuery('movingEntities', { 
				with: ['position', 'velocity']
			})
			.setProcess(() => {
				// Dummy process function
			});
		
		// Create and configure a bundle
		const bundle = createBundle<PositionComponents, {}, PositionResources>()
			.addSystem(systemBuilder as SystemBuilder<PositionComponents, {}, PositionResources>)
			.addResource('gravity', { value: 9.8 });
		
		const addSystemSpy = spyOn(world, 'addSystem');
		const addResourceSpy = spyOn(world, 'addResource');
		
		// Install the bundle
		bundle.installInto(world);
		
		// Verify that the world methods were called correctly
		expect(addSystemSpy).toHaveBeenCalledTimes(1);
		expect(addResourceSpy).toHaveBeenCalledTimes(1);
		expect(addResourceSpy).toHaveBeenCalledWith('gravity', { value: 9.8 });
	});

	test('should handle a world installing a bundle with the install method', () => {
		const bundle = createBundle<PositionComponents, {}, PositionResources>()
			.addResource('gravity', { value: 9.8 });
			
		const world = new SimpleECS<PositionComponents, {}, PositionResources>();
		const installIntoSpy = spyOn(bundle, 'installInto');
		
		world.install(bundle);
		
		expect(installIntoSpy).toHaveBeenCalledTimes(1);
		expect(installIntoSpy).toHaveBeenCalledWith(world);
	});

	test('should combine two bundles with combineBundle', () => {
		// Create worlds to get properly typed system builders
		const physicsWorld = new SimpleECS<PositionComponents, {}, PositionResources>();
		const playerWorld = new SimpleECS<PlayerComponents, {}, PlayerResources>();
		
		// Create system builders
		const physicsSystem = physicsWorld.createSystem('physics')
			.addQuery('movingEntities', { 
				with: ['position', 'velocity']
			})
			.setProcess(() => {
				// Dummy process function
			});
			
		const playerSystem = playerWorld.createSystem('player')
			.addQuery('players', { 
				with: ['player', 'health']
			})
			.setProcess(() => {
				// Dummy process function
			});
		
		// Create the physics bundle
		const physicsBundle = createBundle<PositionComponents, {}, PositionResources>()
			.addResource('gravity', { value: 9.8 })
			.addSystem(physicsSystem as SystemBuilder<PositionComponents, {}, PositionResources>);
			
		// Create the player bundle
		const playerBundle = createBundle<PlayerComponents, {}, PlayerResources>()
			.addResource('playerControls', { up: false, down: false, left: false, right: false })
			.addSystem(playerSystem as SystemBuilder<PlayerComponents, {}, PlayerResources>);
			
		// Combine the bundles
		const gameBundle = combineBundle(physicsBundle, playerBundle);
		
		// Check that the combined bundle has the systems and resources from both bundles
		const gameBundleAny = gameBundle as any;
		expect(gameBundleAny._systems.length).toBe(2);
		expect(gameBundleAny._resources.size).toBe(2);
		expect(gameBundleAny._resources.has('gravity')).toBe(true);
		expect(gameBundleAny._resources.has('playerControls')).toBe(true);
		
		// Install the combined bundle into a world
		const world = new SimpleECS<GameComponents, {}, GameResources>();
		const addSystemSpy = spyOn(world, 'addSystem');
		const addResourceSpy = spyOn(world, 'addResource');
		
		gameBundle.installInto(world);
		
		expect(addSystemSpy).toHaveBeenCalledTimes(2);
		expect(addResourceSpy).toHaveBeenCalledTimes(2);
	});
}); 