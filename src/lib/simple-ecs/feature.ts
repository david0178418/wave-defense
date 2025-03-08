import type SimpleECS from './simple-ecs';
import { SystemBuilder, createSystem } from './system-builder';

export default class Feature<
	ComponentTypes,
	EventTypes extends Record<string, any> = Record<string, any>,
	ResourceTypes extends Record<string, any> = Record<string, any>,
> {
	constructor(private _ecs: SimpleECS<ComponentTypes, EventTypes, ResourceTypes>) {}

	/**
	 * Helper method to create a properly typed SystemBuilder
	 */
	createSystem(label: string): SystemBuilder<ComponentTypes, EventTypes, ResourceTypes> {
		return createSystem<ComponentTypes, EventTypes, ResourceTypes>(label);
	}

	addSystem(
		systemOrBuilder: SystemBuilder<ComponentTypes, EventTypes, ResourceTypes, any>
	) {
		this._ecs.addSystem(systemOrBuilder);
		return this;
	}

	addResource<K extends keyof ResourceTypes>(label: K, resource: ResourceTypes[K]) {
		this._ecs.addResource(label, resource);
		return this;
	}
}