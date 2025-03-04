interface Entity<ComponentTypes> {
	id: number;
	components: Partial<ComponentTypes>;
}

// Event system types
interface EventHandler<T> {
	callback: (data: T) => void;
	once: boolean;
}

class EventBus<EventTypes> {
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

	/**
	 * Publish an event
	 */
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
		
		// Remove one-time handlers
		if (handlersToRemove.length > 0) {
			for (const handler of handlersToRemove) {
				const index = handlers.indexOf(handler);
				if (index !== -1) {
					handlers.splice(index, 1);
				}
			}
		}
	}

	/**
	 * Clear all event subscriptions
	 */
	clear(): void {
		this.handlers.clear();
	}

	/**
	 * Clear subscriptions for a specific event
	 */
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
	private nextId: number = 0;
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

interface System<
	ComponentTypes,
	WithComponents extends keyof ComponentTypes = never,
	WithoutComponents extends keyof ComponentTypes = never,
	EventTypes = any
> {
	label: string;
	with?: ReadonlyArray<WithComponents>;
	without?: ReadonlyArray<WithoutComponents>;
	process(
		entities: FilteredEntity<ComponentTypes, WithComponents, WithoutComponents>[], 
		deltaTime: number, 
		entityManager: EntityManager<ComponentTypes>,
		eventBus: EventBus<EventTypes>
	): void;
	
	// Optional lifecycle hooks for event handling
	onAttach?: (eventBus: EventBus<EventTypes>) => void;
	onDetach?: (eventBus: EventBus<EventTypes>) => void;
}

export
class World<ComponentTypes, EventTypes = any> {
	private entityManager: EntityManager<ComponentTypes>;
	private systems: System<ComponentTypes, any, any, EventTypes>[] = [];
	private eventBus: EventBus<EventTypes>;

	constructor() {
		this.entityManager = new EntityManager<ComponentTypes>();
		this.eventBus = new EventBus<EventTypes>();
	}

	addSystem<
		WithComponents extends keyof ComponentTypes = never,
		WithoutComponents extends keyof ComponentTypes = never
	>(system: System<ComponentTypes, WithComponents, WithoutComponents, EventTypes>) {
		this.systems.push(system);
		
		// Call onAttach if defined
		if (system.onAttach) {
			system.onAttach(this.eventBus);
		}
		
		return this;
	}
	
	removeSystem(systemLabel: string) {
		const index = this.systems.findIndex(sys => sys.label === systemLabel);
		if (index !== -1) {
			const system = this.systems[index];
			
			// Call onDetach if defined
			if (system && system.onDetach) {
				system.onDetach(this.eventBus);
			}
			
			this.systems.splice(index, 1);
			return true;
		}
		return false;
	}

	update(deltaTime: number) {
		for (const system of this.systems) {
			const requiredComponents = system.with || [];
			const excludedComponents = system.without || [];
			const entities = this.entityManager.getEntitiesWithComponents(
				requiredComponents as any,
				excludedComponents as any
			);
			system.process(entities, deltaTime, this.entityManager, this.eventBus);
		}
	}
	
	/**
	 * Get the event bus to allow external systems to subscribe/publish events
	 */
	getEventBus(): EventBus<EventTypes> {
		return this.eventBus;
	}

	createEntity(): number {
		return this.entityManager.createEntity();
	}

	removeEntity(entityId: number): boolean {
		return this.entityManager.removeEntity(entityId);
	}

	addComponent<ComponentName extends keyof ComponentTypes>(
		entityId: number,
		componentName: ComponentName,
		data: ComponentTypes[ComponentName]
	) {
		this.entityManager.addComponent(entityId, componentName, data);
		return this;
	}

	removeComponent<ComponentName extends keyof ComponentTypes>(
		entityId: number, 
		componentName: ComponentName
	) {
		this.entityManager.removeComponent(entityId, componentName);
		return this;
	}

	getComponent<ComponentName extends keyof ComponentTypes>(entityId: number, componentName: ComponentName): ReturnType<typeof EntityManager.prototype.getComponent> {
		return this.entityManager.getComponent(entityId, componentName);
	}
}
