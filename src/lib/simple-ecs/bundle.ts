import { SystemBuilder, createSystem } from './system-builder';
import type SimpleECS from './simple-ecs';

/**
 * Bundle class that encapsulates a set of components, resources, events, and systems
 * that can be merged into a SimpleECS instance
 */
export default class Bundle<
	ComponentTypes extends Record<string, any> = Record<string, any>,
	EventTypes extends Record<string, any> = Record<string, any>,
	ResourceTypes extends Record<string, any> = Record<string, any>
> {
	private _systems: SystemBuilder<ComponentTypes, EventTypes, ResourceTypes, any>[] = [];
	private _resources: Map<keyof ResourceTypes, any> = new Map();

	/**
	 * Helper method to create a properly typed SystemBuilder for this bundle
	 */
	createSystem(label: string): SystemBuilder<ComponentTypes, EventTypes, ResourceTypes> {
		return createSystem<ComponentTypes, EventTypes, ResourceTypes>(label);
	}

	/**
	 * Add a system to this bundle
	 */
	addSystem<QueryDefs extends Record<string, any> = any>(
		system: SystemBuilder<ComponentTypes, EventTypes, ResourceTypes, QueryDefs>
	) {
		this._systems.push(system);
		return this;
	}

	/**
	 * Add a resource to this bundle
	 */
	addResource<K extends keyof ResourceTypes>(label: K, resource: ResourceTypes[K]) {
		this._resources.set(label, resource);
		return this;
	}

	/**
	 * Install this bundle into an ECS instance
	 */
	installInto(ecs: SimpleECS<ComponentTypes, EventTypes, ResourceTypes>) {
		// Add all systems
		for (const system of this._systems) {
			ecs.addSystem(system);
		}

		// Add all resources
		for (const [label, resource] of this._resources.entries()) {
			ecs.addResource(label as keyof ResourceTypes, resource);
		}

		return ecs;
	}
}

/**
 * Create a new bundle with the specified types
 */
export function createBundle<
	ComponentTypes extends Record<string, any> = Record<string, any>,
	EventTypes extends Record<string, any> = Record<string, any>,
	ResourceTypes extends Record<string, any> = Record<string, any>
>() {
	return new Bundle<ComponentTypes, EventTypes, ResourceTypes>();
}

/**
 * Utility type for merging two types
 */
export type Merge<T1, T2> = {
	[K in keyof T1 | keyof T2]: K extends keyof T1 & keyof T2
		? T1[K] | T2[K]
		: K extends keyof T1
			? T1[K]
			: K extends keyof T2
				? T2[K]
				: never;
};

/**
 * Combine multiple bundles into a single bundle with merged types
 */
export function combineBundle<
	C1 extends Record<string, any>,
	E1 extends Record<string, any>,
	R1 extends Record<string, any>,
	C2 extends Record<string, any>,
	E2 extends Record<string, any>,
	R2 extends Record<string, any>
>(
	bundle1: Bundle<C1, E1, R1>,
	bundle2: Bundle<C2, E2, R2>
): Bundle<Merge<C1, C2>, Merge<E1, E2>, Merge<R1, R2>> {
	// We need to cast here as TypeScript can't fully track the combined types
	const combined = new Bundle<Merge<C1, C2>, Merge<E1, E2>, Merge<R1, R2>>();

	// Install bundle1 and bundle2 systems and resources into the combined bundle
	// This is a simplification - in a full implementation we would need to directly
	// access the private members or add methods to expose them
	
	// For the purposes of this example, we're going to use "any" casts
	// A more complete implementation would provide proper accessors
	const b1 = bundle1 as any;
	const b2 = bundle2 as any;
	
	// Copy systems from both bundles
	for (const system of b1._systems) {
		combined.addSystem(system);
	}
	
	for (const system of b2._systems) {
		combined.addSystem(system);
	}
	
	// Copy resources from both bundles
	for (const [label, resource] of b1._resources.entries()) {
		combined.addResource(label, resource);
	}
	
	for (const [label, resource] of b2._resources.entries()) {
		combined.addResource(label, resource);
	}
	
	return combined;
} 