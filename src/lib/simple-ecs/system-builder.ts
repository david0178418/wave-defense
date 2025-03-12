import Bundle from "./bundle";
import type EntityManager from "./entity-manager";
import type EventBus from "./event-bus";
import type ResourceManager from "./resource-manager";
import type { FilteredEntity, System } from "./types";

/**
 * Builder class for creating type-safe ECS Systems with proper query inference
 */
export class SystemBuilder<
	ComponentTypes extends Record<string, any> = Record<string, any>,
	EventTypes extends Record<string, any> = Record<string, any>,
	ResourceTypes extends Record<string, any> = Record<string, any>,
	Queries extends Record<string, QueryDefinition<ComponentTypes>> = {},
> {
	private queries: Queries = {} as Queries;
	private processFunction?: ProcessFunction<ComponentTypes, EventTypes, ResourceTypes, Queries>;
	private attachFunction?: LifecycleFunction<ComponentTypes, EventTypes, ResourceTypes>;
	private detachFunction?: LifecycleFunction<ComponentTypes, EventTypes, ResourceTypes>;
	private eventHandlers?: any;

	constructor(
		private _label: string,
		private _bundle = new Bundle<ComponentTypes, EventTypes, ResourceTypes>()
	) {
		console.log(`Adding system ${this._label}`);
	}

	get label() {
		return this._label;
	}

	get bundle() {
		return this._bundle;
	}

	/**
	 * Add a query definition to the system
	 */
	addQuery<
		QueryName extends string,
		WithComponents extends keyof ComponentTypes,
		WithoutComponents extends keyof ComponentTypes = never,
	>(
		name: QueryName,
		definition: {
			with: ReadonlyArray<WithComponents>;
			without?: ReadonlyArray<WithoutComponents>;
		}
	): SystemBuilder<
		ComponentTypes,
		EventTypes,
		ResourceTypes,
		Queries & Record<QueryName, QueryDefinition<ComponentTypes, WithComponents, WithoutComponents>>
	> {
		// Cast is needed because TypeScript can't preserve the type information
		// when modifying an object property
		const newBuilder = this as any;
		newBuilder.queries = {
			...this.queries,
			[name]: definition,
		};
		return newBuilder;
	}

	/**
	 * Set the system's process function that runs each update
	 */
	setProcess<WithComp extends keyof ComponentTypes, WithoutComp extends keyof ComponentTypes>(
		process: ProcessFunction<ComponentTypes, EventTypes, ResourceTypes, Queries, WithComp, WithoutComp>
	): SystemBuilder<ComponentTypes, EventTypes, ResourceTypes, Queries> {
		this.processFunction = process;
		return this;
	}

	/**
	 * Set the onAttach lifecycle hook
	 */
	setOnAttach(
		onAttach: LifecycleFunction<ComponentTypes, EventTypes, ResourceTypes>
	): SystemBuilder<ComponentTypes, EventTypes, ResourceTypes, Queries> {
		this.attachFunction = onAttach;
		return this;
	}

	/**
	 * Set the onDetach lifecycle hook
	 */
	setOnDetach(
		onDetach: LifecycleFunction<ComponentTypes, EventTypes, ResourceTypes>
	): SystemBuilder<ComponentTypes, EventTypes, ResourceTypes, Queries> {
		this.detachFunction = onDetach;
		return this;
	}

	/**
	 * Set event handlers for the system
	 */
	setEventHandlers(
		handlers: {
			[EventName in keyof EventTypes]?: {
				handler(
					data: EventTypes[EventName],
					entityManager: EntityManager<ComponentTypes>,
					resourceManager: ResourceManager<ResourceTypes>,
					eventBus: EventBus<EventTypes>,
				): void;
			};
		}
	): SystemBuilder<ComponentTypes, EventTypes, ResourceTypes, Queries> {
		this.eventHandlers = handlers;
		return this;
	}

	/**
	 * Build the final system object
	 */
	build(): System<ComponentTypes, any, any, EventTypes, ResourceTypes> {
		const system: System<ComponentTypes, any, any, EventTypes, ResourceTypes> = {
			label: this._label,
			entityQueries: this.queries as any,
		};

		if (this.processFunction) {
			system.process = this.processFunction as any;
		}

		if (this.attachFunction) {
			system.onAttach = this.attachFunction;
		}

		if (this.detachFunction) {
			system.onDetach = this.detachFunction;
		}

		if (this.eventHandlers) {
			system.eventHandlers = this.eventHandlers;
		}

		return system;
	}
}

// Helper type definitions
type QueryDefinition<
	ComponentTypes,
	WithComponents extends keyof ComponentTypes = any,
	WithoutComponents extends keyof ComponentTypes = any,
> = {
	with: ReadonlyArray<WithComponents>;
	without?: ReadonlyArray<WithoutComponents>;
};

type QueryResults<
	ComponentTypes,
	Queries extends Record<string, QueryDefinition<ComponentTypes>>,
> = {
	[QueryName in keyof Queries]: QueryName extends string 
		? FilteredEntity<
				ComponentTypes,
				Queries[QueryName] extends QueryDefinition<ComponentTypes, infer W, any> ? W : never,
				Queries[QueryName] extends QueryDefinition<ComponentTypes, any, infer WO> ? WO : never
		  >[]
		: never;
};

type ProcessFunction<
	ComponentTypes,
	EventTypes,
	ResourceTypes,
	Queries extends Record<string, QueryDefinition<ComponentTypes>>,
	WithComp extends keyof ComponentTypes = any,
	WithoutComp extends keyof ComponentTypes = any,
> = (
	queries: QueryResults<ComponentTypes, Queries>,
	deltaTime: number,
	entityManager: EntityManager<ComponentTypes>,
	resourceManager: ResourceManager<ResourceTypes>,
	eventBus: EventBus<EventTypes>,
) => void;

type LifecycleFunction<
	ComponentTypes,
	EventTypes,
	ResourceTypes,
> = (
	entityManager: EntityManager<ComponentTypes>,
	resourceManager: ResourceManager<ResourceTypes>,
	eventBus: EventBus<EventTypes>,
) => void;

// // Factory function for easier creation
// function createSystem<
// 	ComponentTypes,
// 	EventTypes = any,
// 	ResourceTypes = any
// >(
// 	label: string
// ): SystemBuilder<ComponentTypes, EventTypes, ResourceTypes> {
// 	return new SystemBuilder<ComponentTypes, EventTypes, ResourceTypes>(label);
// } 