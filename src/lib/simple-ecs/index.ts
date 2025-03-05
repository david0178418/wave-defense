interface Entity<ComponentTypes> {
	id: number;
	components: Partial<ComponentTypes>;
}

// Event system types
interface EventHandler<T> {
	callback: (data: T) => void;
	once: boolean;
}

export class ResourceManager<ResourceTypes> {
	private resources: Map<keyof ResourceTypes, any> = new Map();

	add<K extends keyof ResourceTypes>(label: K, resource: ResourceTypes[K]): ResourceTypes[K] {
		this.resources.set(label, resource);
		return resource;
	}

	get<K extends keyof ResourceTypes>(label: K): ResourceTypes[K] {
		const resource = this.resources.get(label);
		if (!resource) {
			console.error(label);
			throw new Error(`Resource ${label.toString()} not found`);
		}
		return resource;
	}

	has(label: keyof ResourceTypes): boolean {
		return this.resources.has(label);
	}

	remove(label: keyof ResourceTypes): boolean {
		return this.resources.delete(label);
	}
}

export class EventBus<EventTypes> {
	private handlers: Map<keyof EventTypes, Array<EventHandler<any>>> = new Map();

	/**
	 * Subscribe to an event
	 */
	subscribe<E extends keyof EventTypes>(
		eventType: E,
		callback: (data: EventTypes[E]) => void
	): () => void {
		if (!this.handlers.has(eventType)) {
			this.handlers.set(eventType, []);
		}

		const handler: EventHandler<EventTypes[E]> = {
			callback,
			once: false
		};

		this.handlers.get(eventType)!.push(handler);

		// Return unsubscribe function
		return () => {
			const handlers = this.handlers.get(eventType);
			if (handlers) {
				const index = handlers.indexOf(handler);
				if (index !== -1) {
					handlers.splice(index, 1);
				}
			}
		};
	}

	/**
	 * Subscribe to an event once
	 */
	once<E extends keyof EventTypes>(
		eventType: E,
		callback: (data: EventTypes[E]) => void
	): () => void {
		if (!this.handlers.has(eventType)) {
			this.handlers.set(eventType, []);
		}

		const handler: EventHandler<EventTypes[E]> = {
			callback,
			once: true
		};

		this.handlers.get(eventType)!.push(handler);

		// Return unsubscribe function
		return () => {
			const handlers = this.handlers.get(eventType);
			if (handlers) {
				const index = handlers.indexOf(handler);
				if (index !== -1) {
					handlers.splice(index, 1);
				}
			}
		};
	}

	publish<E extends keyof EventTypes>(
		eventType: E,
		data: EventTypes[E]
	): void {
		const handlers = this.handlers.get(eventType);
		if (!handlers) return;

		// Create a copy of handlers to avoid issues with handlers that modify the array
		const handlersToCall = [...handlers];
		
		// Call all handlers and collect handlers to remove
		const handlersToRemove: EventHandler<any>[] = [];
		
		for (const handler of handlersToCall) {
			handler.callback(data);
			if (handler.once) {
				handlersToRemove.push(handler);
			}
		}
		
		if (handlersToRemove.length > 0) {
			for (const handler of handlersToRemove) {
				const index = handlers.indexOf(handler);
				if (index !== -1) {
					handlers.splice(index, 1);
				}
			}
		}
	}

	clear(): void {
		this.handlers.clear();
	}

	clearEvent<E extends keyof EventTypes>(eventType: E): void {
		this.handlers.delete(eventType);
	}
}

interface FilteredEntity<
    ComponentTypes,
    WithComponents extends keyof ComponentTypes = never,
    WithoutComponents extends keyof ComponentTypes = never,
> {
    id: number;
    components: Omit<Partial<ComponentTypes>, WithoutComponents> & {
        [ComponentName in WithComponents]: ComponentTypes[ComponentName]
    };
}

class EntityManager<ComponentTypes> {
	private nextId: number = 1;
	private entities: Map<number, Entity<ComponentTypes>> = new Map();
	private componentIndices: Map<keyof ComponentTypes, Set<number>> = new Map();
	
	createEntity(): number {
		const id = this.nextId++;
		const entity: Entity<ComponentTypes> = { id, components: {} };
		this.entities.set(id, entity);
		return id;
	}

	addComponent<ComponentName extends keyof ComponentTypes>(
		entityId: number,
		componentName: ComponentName,
		data: ComponentTypes[ComponentName]
	) {
		const entity = this.entities.get(entityId);

		if (!entity) throw new Error(`Entity ${entityId} does not exist`);

		entity.components[componentName] = data;
		
		// Update component index
		if (!this.componentIndices.has(componentName)) {
			this.componentIndices.set(componentName, new Set());
		}
		this.componentIndices.get(componentName)?.add(entityId);
	}

	removeComponent<ComponentName extends keyof ComponentTypes>(entityId: number, componentName: ComponentName) {
		const entity = this.entities.get(entityId);
		if (!entity) throw new Error(`Entity ${entityId} does not exist`);

		delete entity.components[componentName];
		
		// Update component index
		this.componentIndices.get(componentName)?.delete(entityId);
	}

	getComponent<ComponentName extends keyof ComponentTypes>(entityId: number, componentName: ComponentName): ComponentTypes[ComponentName] | null {
		const entity = this.entities.get(entityId);

		if (!entity) throw new Error(`Entity ${entityId} does not exist`);

		return entity.components[componentName] || null;
	}

	getEntitiesWithComponents<
		WithComponents extends keyof ComponentTypes = never,
		WithoutComponents extends keyof ComponentTypes = never
	>(
		required: ReadonlyArray<WithComponents> = [] as any, 
		excluded: ReadonlyArray<WithoutComponents> = [] as any,
	): Array<FilteredEntity<ComponentTypes, WithComponents extends never ? never : WithComponents, WithoutComponents extends never ? never : WithoutComponents>> {
		// Use the smallest component set as base for better performance
		if (required.length === 0) {
			if (excluded.length === 0) {
				return Array.from(this.entities.values()) as any;
			}

			return Array
				.from(this.entities.values())
				.filter((entity) => {
					return excluded.every(comp => !(comp in entity.components));
				}) as any;
		}
		
		// Find the component with the smallest entity set to start with
		const smallestComponent = required.reduce((smallest, comp) => {
			const set = this.componentIndices.get(comp);
			const currentSize = set ? set.size : 0;
			const smallestSize = this.componentIndices.get(smallest!)?.size ?? Infinity;
			
			return currentSize < smallestSize ? comp : smallest;
		}, required[0])!;

		// Start with the entities from the smallest component set
		const candidates = Array.from(this.componentIndices.get(smallestComponent) || []);

		// Return full entity objects, not just IDs
		return candidates
			.filter(id => {
				const entity = this.entities.get(id);
				return (
					entity &&
					required.every(comp => comp in entity.components) && 
					excluded.every(comp => !(comp in entity.components))
				);
			})
			.map(id => this.entities.get(id)!) as Array<FilteredEntity<ComponentTypes, WithComponents extends never ? never : WithComponents, WithoutComponents extends never ? never : WithoutComponents>>;
	}

	removeEntity(entityId: number): boolean {
		const entity = this.entities.get(entityId);
		if (!entity) return false;
		
		// Remove entity from all component indices
		for (const componentName of Object.keys(entity.components) as Array<keyof ComponentTypes>) {
			this.componentIndices.get(componentName)?.delete(entityId);
		}
		
		// Remove the entity itself
		return this.entities.delete(entityId);
	}
}

export interface System<
	ComponentTypes,
	WithComponents extends keyof ComponentTypes = never,
	WithoutComponents extends keyof ComponentTypes = never,
	EventTypes = any,
	ResourceTypes = any,
> {
	label: string;
	with?: ReadonlyArray<WithComponents>;
	without?: ReadonlyArray<WithoutComponents>;
	process?(
		entities: FilteredEntity<ComponentTypes, WithComponents, WithoutComponents>[], 
		deltaTime: number, 
		entityManager: EntityManager<ComponentTypes>,
		resourceManager: ResourceManager<ResourceTypes>,
		eventBus: EventBus<EventTypes>,
	): void;
	
	// Optional lifecycle hooks for event handling
	onAttach?(
		entityManager: EntityManager<ComponentTypes>,
		resourceManager: ResourceManager<ResourceTypes>,
		eventBus: EventBus<EventTypes>,
	): void;
	onDetach?(
		entityManager: EntityManager<ComponentTypes>,
		resourceManager: ResourceManager<ResourceTypes>,
		eventBus: EventBus<EventTypes>,
	): void;
	
	// Structured container for event handlers
	eventHandlers?: {
		[EventName in keyof EventTypes]?: {
			handler(
				data: EventTypes[EventName],
				entityManager: EntityManager<ComponentTypes>,
				resourceManager: ResourceManager<ResourceTypes>,
				eventBus: EventBus<EventTypes>,
			): void;
		};
	};
}

export
class World<ComponentTypes, EventTypes = any, ResourceTypes extends Record<string, any> = {}> {
	private _entityManager: EntityManager<ComponentTypes>;
	private _systems: System<ComponentTypes, any, any, EventTypes, ResourceTypes>[] = [];
	private _eventBus: EventBus<EventTypes>;
	private _resourceManager: ResourceManager<ResourceTypes>;

	constructor() {
		this._entityManager = new EntityManager<ComponentTypes>();
		this._eventBus = new EventBus<EventTypes>();
		this._resourceManager = new ResourceManager<ResourceTypes>();
	}

	addSystem<
		WithComponents extends keyof ComponentTypes = never,
		WithoutComponents extends keyof ComponentTypes = never
	>(system: System<ComponentTypes, WithComponents, WithoutComponents, EventTypes, ResourceTypes>) {
		this._systems.push(system);
		
		// Call onAttach if defined
		if (system.onAttach) {
			system.onAttach(
				this._entityManager,
				this._resourceManager,
				this._eventBus,
			);
		}
		
		// Auto-subscribe to events if eventHandlers are defined
		if (system.eventHandlers) {
			for (const eventName in system.eventHandlers) {
				const handler = system.eventHandlers[eventName];
				if (handler?.handler) {
					// Create a wrapper that passes the additional parameters to the handler
					const wrappedHandler = (data: any) => {
						handler.handler(
							data,
							this._entityManager,
							this._resourceManager,
							this._eventBus,
						);
					};
					
					this._eventBus.subscribe(
						eventName, 
						wrappedHandler
					);
				}
			}
		}
		
		return this;
	}
	
	removeSystem(systemLabel: string) {
		const index = this._systems.findIndex(sys => sys.label === systemLabel);
		if (index !== -1) {
			const system = this._systems[index];
			
			system?.onDetach?.(
				this._entityManager,
				this._resourceManager,
				this._eventBus,
			);
			
			// We no longer need to manually unsubscribe events since
			// we don't store unsubscribe functions anymore
			
			this._systems.splice(index, 1);
			return true;
		}
		return false;
	}

	update(deltaTime: number) {
		for (const system of this._systems) {
			const requiredComponents = system.with || [];
			const excludedComponents = system.without || [];
			const entities = this._entityManager.getEntitiesWithComponents(
				requiredComponents,
				excludedComponents,
			);
			system.process?.(
				entities,
				deltaTime,
				this._entityManager,
				this._resourceManager,
				this._eventBus,
			);
		}
	}
	
	get eventBus(): EventBus<EventTypes> {
		return this._eventBus;
	}

	get resourceManager(): ResourceManager<ResourceTypes> {
		return this._resourceManager;
	}

	createEntity(): number {
		return this._entityManager.createEntity();
	}

	removeEntity(entityId: number): boolean {
		return this._entityManager.removeEntity(entityId);
	}

	addComponent<ComponentName extends keyof ComponentTypes>(
		entityId: number,
		componentName: ComponentName,
		data: ComponentTypes[ComponentName]
	) {
		this._entityManager.addComponent(entityId, componentName, data);
		return this;
	}

	removeComponent<ComponentName extends keyof ComponentTypes>(
		entityId: number, 
		componentName: ComponentName
	) {
		this._entityManager.removeComponent(entityId, componentName);
		return this;
	}

	getComponent<ComponentName extends keyof ComponentTypes>(entityId: number, componentName: ComponentName): ComponentTypes[ComponentName] | null {
		return this._entityManager.getComponent(entityId, componentName);
	}

	addResource<K extends keyof ResourceTypes>(label: K, resource: ResourceTypes[K]) {
		this._resourceManager.add(label, resource);
		return this
	}

	getResource<K extends keyof ResourceTypes>(label: K): ResourceTypes[K] {
		return this._resourceManager.get(label);
	}

	hasResource(label: string): boolean {
		return this._resourceManager.has(label);
	}

	removeResource(label: string): boolean {
		return this._resourceManager.remove(label);
	}
}
