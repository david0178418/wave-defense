import { expect, describe, test } from 'bun:test';
import SimpleECS from './simple-ecs';
import Bundle, { createBundle, combineBundle } from './bundle';

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
		
		// Verify systems were added by checking the built systems
		const systems = bundle.getSystems();
		expect(systems.length).toBe(1);
		expect(systems[0]?.label).toBe('test');
	});

	test('should add resources to the bundle', () => {
		const bundle = createBundle<PositionComponents, {}, PositionResources>();
		bundle.addResource('gravity', { value: 9.8 });
		
		// Verify resources were added
		const resources = bundle.getResources();
		expect(resources.size).toBe(1);
		expect(resources.get('gravity')).toEqual({ value: 9.8 });
	});

	test('should install a bundle into a SimpleECS instance', () => {
		// Create a world
		const world = new SimpleECS<PositionComponents, {}, PositionResources>();
		
		// Create a bundle and system builder within that bundle
		const tempBundle = createBundle<PositionComponents, {}, PositionResources>();
		const systemBuilder = tempBundle.createSystem('movement')
			.addQuery('movingEntities', { 
				with: ['position', 'velocity']
			})
			.setProcess(() => {
				// Dummy process function
			});
		
		// Create another bundle to actually install
		const bundle = createBundle<PositionComponents, {}, PositionResources>()
			.addSystem(systemBuilder)
			.addResource('gravity', { value: 9.8 });
		
		// Install the bundle
		world.install(bundle);
		
		// Verify the bundle was installed by checking for the resource
		expect(world.hasResource('gravity')).toBe(true);
		expect(world.resourceManager.get('gravity')).toEqual({ value: 9.8 });
		
		// Verify the bundle ID is in the installed bundles
		expect(world.installedBundles).toContain(bundle.id);
	});

	test('should handle a world installing a bundle with the install method', () => {
		const bundle = createBundle<PositionComponents, {}, PositionResources>('test-bundle')
			.addResource('gravity', { value: 9.8 });
			
		const world = new SimpleECS<PositionComponents, {}, PositionResources>();
		
		world.install(bundle);
		
		// Verify the bundle was installed by checking the installed bundles
		expect(world.installedBundles).toContain('test-bundle');
		expect(world.hasResource('gravity')).toBe(true);
	});

	test('should combine two bundles with combineBundle', () => {
		// Create bundles to get properly typed system builders
		const physicsBundle = createBundle<PositionComponents, {}, PositionResources>();
		const playerBundle = createBundle<PlayerComponents, {}, PlayerResources>();
		
		// Create system builders using the bundles
		const physicsSystem = physicsBundle.createSystem('physics')
			.addQuery('movingEntities', { 
				with: ['position', 'velocity']
			})
			.setProcess(() => {
				// Dummy process function
			});
			
		const playerSystem = playerBundle.createSystem('player')
			.addQuery('players', { 
				with: ['player', 'health']
			})
			.setProcess(() => {
				// Dummy process function
			});
		
		// Create the physics bundle with its system
		const physicsConfigBundle = createBundle<PositionComponents, {}, PositionResources>('physics')
			.addResource('gravity', { value: 9.8 })
			.addSystem(physicsSystem);
			
		// Create the player bundle with its system
		const playerConfigBundle = createBundle<PlayerComponents, {}, PlayerResources>('player')
			.addResource('playerControls', { up: false, down: false, left: false, right: false })
			.addSystem(playerSystem);
			
		// Combine the bundles
		const gameBundle = combineBundle(physicsConfigBundle, playerConfigBundle, 'game');
		
		// Check that the combined bundle has the systems and resources from both bundles
		expect(gameBundle.getSystems().length).toBe(2);
		expect(gameBundle.getResources().size).toBe(2);
		expect(gameBundle.getResources().has('gravity')).toBe(true);
		expect(gameBundle.getResources().has('playerControls')).toBe(true);
		
		// Install the combined bundle into a world
		const world = new SimpleECS<GameComponents, {}, GameResources>();
		
		// Install and verify bundle was successfully installed
		world.install(gameBundle);
		expect(world.installedBundles).toContain('game');
		expect(world.hasResource('gravity')).toBe(true);
		expect(world.hasResource('playerControls')).toBe(true);
	});
}); 