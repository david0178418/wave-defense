import EntityManager from "./entity-manager";
import EventBus from "./event-bus";
import ResourceManager from "./resource-manager";
import type { System } from "./types";

export default
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
