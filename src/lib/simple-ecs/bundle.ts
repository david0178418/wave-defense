import type { System } from './types';
import { SystemBuilder, createSystem } from './system-builder';

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
	private _id: string;

	constructor(id?: string) {
		this._id = id || `bundle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}

	/**
	 * Get the unique ID of this bundle
	 */
	get id(): string {
		return this._id;
	}

	/**
	 * Set the ID of this bundle
	 * @internal Used by combineBundles
	 */
	set id(value: string) {
		this._id = value;
	}

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
	 * Get all systems defined in this bundle
	 * Returns built System objects instead of SystemBuilders
	 */
	getSystems(): System<ComponentTypes, any, any, EventTypes, ResourceTypes>[] {
		return this._systems.map(builder => builder.build());
	}

	/**
	 * Get all resources defined in this bundle
	 */
	getResources(): Map<keyof ResourceTypes, any> {
		return new Map(this._resources);
	}

	getResource<K extends keyof ResourceTypes>(key: K): ResourceTypes[K] {
		return this._resources.get(key);
	}

	/**
	 * Get the system builders for internal use
	 * @internal
	 */
	getSystemBuilders(): SystemBuilder<ComponentTypes, EventTypes, ResourceTypes, any>[] {
		return [...this._systems];
	}
}

/**
 * Create a new bundle with the specified types
 */
export function createBundle<
	ComponentTypes extends Record<string, any> = Record<string, any>,
	EventTypes extends Record<string, any> = Record<string, any>,
	ResourceTypes extends Record<string, any> = Record<string, any>
>(id?: string) {
	return new Bundle<ComponentTypes, EventTypes, ResourceTypes>(id);
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
	bundle2: Bundle<C2, E2, R2>,
	id?: string
): Bundle<Merge<C1, C2>, Merge<E1, E2>, Merge<R1, R2>> {
	// Create a new bundle with the merged types
	const combined = new Bundle<Merge<C1, C2>, Merge<E1, E2>, Merge<R1, R2>>(
		id || `combined_${bundle1.id}_${bundle2.id}`
	);
	
	// Copy systems from both bundles
	for (const system of bundle1.getSystemBuilders()) {
		combined.addSystem(system as any);
	}
	
	for (const system of bundle2.getSystemBuilders()) {
		combined.addSystem(system as any);
	}
	
	// Copy resources from both bundles (bundle2 takes precedence for conflicts)
	for (const [label, resource] of bundle1.getResources().entries()) {
		combined.addResource(label as any, resource);
	}
	
	for (const [label, resource] of bundle2.getResources().entries()) {
		combined.addResource(label as any, resource);
	}
	
	return combined;
}

/**
 * Combine any number of bundles into a single bundle
 */
export function combineBundles<
	C extends Record<string, any>,
	E extends Record<string, any>,
	R extends Record<string, any>
>(bundles: Array<Bundle<C, E, R>>, id?: string): Bundle<C, E, R> {
	if (bundles.length === 0) {
		return createBundle<C, E, R>(id || 'empty_combined_bundle');
	}
	
	if (bundles.length === 1 && bundles[0]) {
		const bundle = bundles[0];
		if (id) {
			bundle.id = id;
		}
		return bundle;
	}
	
	// If we have invalid bundles, create a new empty one with the given ID
	if (!bundles[0]) {
		return createBundle<C, E, R>(id || 'fallback_bundle');
	}
	
	// Start with the first bundle
	let result = bundles[0];
	
	// Combine with each additional bundle
	for (let i = 1; i < bundles.length; i++) {
		const nextBundle = bundles[i];
		if (nextBundle) {
			result = combineBundle(result, nextBundle);
		}
	}
	
	// Set ID if provided
	if (id) {
		result.id = id;
	}
	
	return result;
} 