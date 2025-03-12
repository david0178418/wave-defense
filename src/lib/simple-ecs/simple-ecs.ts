import EntityManager from "./entity-manager";
import EventBus from "./event-bus";
import ResourceManager from "./resource-manager";
import type { System } from "./types";
import type Bundle from "./bundle";

export default
class SimpleECS<
	ComponentTypes extends Record<string, any> = Record<string, any>,
	EventTypes extends Record<string, any> = Record<string, any>,
	ResourceTypes extends Record<string, any> = Record<string, any>,
> {
	private _entityManager: EntityManager<ComponentTypes>;
	private _systems: System<ComponentTypes, any, any, EventTypes, ResourceTypes>[] = [];
	private _eventBus: EventBus<EventTypes>;
	private _resourceManager: ResourceManager<ResourceTypes>;
	private _installedBundles: Set<string> = new Set();

	constructor() {
		this._entityManager = new EntityManager<ComponentTypes>();
		this._eventBus = new EventBus<EventTypes>();
		this._resourceManager = new ResourceManager<ResourceTypes>();
	}

	/**
	 * Install a bundle into this ECS instance
	 */
	install<
		B extends Record<string, any>,
		E extends Record<string, any>,
		R extends Record<string, any>
	>(bundle: Bundle<B, E, R>): this {
		// Check if this bundle is already installed
		if (this._installedBundles.has(bundle.id)) {
			console.warn(`Bundle ${bundle.id} is already installed`);
			return this;
		}
		
		// Register all systems from the bundle
		for (const system of bundle.getSystems()) {
			// Need to cast here because we can't fully type the system generics
			const typedSystem = system as unknown as System<ComponentTypes, any, any, EventTypes, ResourceTypes>;
			this._systems.push(typedSystem);

			console.log(typedSystem);
			
			// Call onAttach lifecycle hook if defined
			if (typedSystem.onAttach) {
				typedSystem.onAttach(
					this._entityManager,
					this._resourceManager,
					this._eventBus
				);
				if(!bundle.getSystems().length) {
					console.warn(`Bundle ${bundle.id} has no systems`);
					// return this;
				}
			}
			
			// Auto-subscribe to events if eventHandlers are defined
			if (typedSystem.eventHandlers) {
				for (const eventName in typedSystem.eventHandlers) {
					const handler = typedSystem.eventHandlers[eventName];
					if (handler?.handler) {
						// Create a wrapper that passes the additional parameters to the handler
						const wrappedHandler = (data: any) => {
							handler.handler(
								data,
								this._entityManager,
								this._resourceManager,
								this._eventBus
							);
						};
						
						this._eventBus.subscribe(eventName, wrappedHandler);
					}
				}
			}
		}
		
		// Register all resources from the bundle
		const resources = bundle.getResources();
		for (const [key, value] of resources.entries()) {
			this._resourceManager.add(key as any, value);
		}
		
		// Mark this bundle as installed
		this._installedBundles.add(bundle.id);
		
		return this;
	}

	/**
	 * Remove a system by its label
	 */
	removeSystem(label: string): boolean {
		const index = this._systems.findIndex(system => system.label === label);
		if (index === -1) return false;
		
		const system = this._systems[index];
		if (!system) return false;
		
		system.onDetach?.(
			this._entityManager,
			this._resourceManager,
			this._eventBus
		);
		
		// Remove system
		this._systems.splice(index, 1);
		return true;
	}
	
	/**
	 * Check if a resource exists
	 */
	hasResource<K extends keyof ResourceTypes>(key: K): boolean {
		return this._resourceManager.has(key);process
	}
	
	// Entity management methods
	/**
	 * Create a new entity
	 */
	createEntity() {
		return this._entityManager.createEntity();
	}
	
	/**
	 * Remove an entity by ID
	 */
	removeEntity(entityId: number): boolean {
		return this._entityManager.removeEntity(entityId);
	}
	
	/**
	 * Add a component to an entity
	 */
	addComponent<K extends keyof ComponentTypes>(
		entityId: number,
		componentName: K,
		componentData: ComponentTypes[K]
	) {
		this._entityManager.addComponent(entityId, componentName, componentData);
		return this;
	}
	
	/**
	 * Get a component from an entity
	 */
	getComponent<K extends keyof ComponentTypes>(
		entityId: number,
		componentName: K
	): ComponentTypes[K] | null {
		return this._entityManager.getComponent(entityId, componentName);
	}
	
	/**
	 * Check if an entity has a component
	 */
	hasComponent<K extends keyof ComponentTypes>(
		entityId: number,
		componentName: K
	): boolean {
		const component = this._entityManager.getComponent(entityId, componentName);
		return component !== null;
	}
	
	/**
	 * Remove a component from an entity
	 */
	removeComponent<K extends keyof ComponentTypes>(
		entityId: number,
		componentName: K
	): boolean {
		try {
			this._entityManager.removeComponent(entityId, componentName);
			return true;
		} catch (error) {
			return false;
		}
	}
	
	/**
	 * Get all entities with specific components
	 */
	getEntitiesWithComponents(
		withComponents: (keyof ComponentTypes)[],
		withoutComponents: (keyof ComponentTypes)[] = []
	) {
		return this._entityManager.getEntitiesWithComponents(
			withComponents,
			withoutComponents
		);
	}
	
	/**
	 * Update all systems
	 */
	update(deltaTime: number) {
		for (const system of this._systems) {
			if (!system.process) continue;
			
			// Prepare query results
			const queryResults: any = {};
			
			// Process entity queries if defined
			if (system.entityQueries) {
				for (const queryName in system.entityQueries) {
					const query = system.entityQueries[queryName];
					if (query) {
						queryResults[queryName] = this._entityManager.getEntitiesWithComponents(
							query.with,
							query.without || []
						);
					}
				}
				
				// Call the system's process method
				system.process(
					queryResults,
					deltaTime,
					this._entityManager,
					this._resourceManager,
					this._eventBus
				);
			} else {
				// No queries defined, pass an empty array
				system.process(
					[],
					deltaTime,
					this._entityManager,
					this._resourceManager,
					this._eventBus
				);
			}
		}
	}
	
	// Getters for the internal managers
	get entityManager() {
		return this._entityManager;
	}
	
	get eventBus() {
		return this._eventBus;
	}
	
	get resourceManager() {
		return this._resourceManager;
	}
	
	/**
	 * Get all installed bundle IDs
	 */
	get installedBundles(): string[] {
		return Array.from(this._installedBundles);
	}
}
