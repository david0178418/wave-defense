import type { System } from './types';
import type SimpleECS from './simple-ecs';

export default class Feature<
	ComponentTypes,
	EventTypes extends Record<string, any> = Record<string, any>,
	ResourceTypes extends Record<string, any> = Record<string, any>,
> {
	private _pendingSystems: System<ComponentTypes, any, any, EventTypes, ResourceTypes>[] = [];
	private _pendingResources: Map<keyof ResourceTypes, ResourceTypes[keyof ResourceTypes]> = new Map();

	constructor(private _ecs: SimpleECS<ComponentTypes, EventTypes, ResourceTypes>) {}

	addSystem<
		WithComponents extends keyof ComponentTypes = never,
		WithoutComponents extends keyof ComponentTypes = never
	>(system: System<ComponentTypes, WithComponents, WithoutComponents, EventTypes, ResourceTypes>) {
		this._pendingSystems.push(system);
		return this;
	}

	addResource<K extends keyof ResourceTypes>(label: K, resource: ResourceTypes[K]) {
		this._pendingResources.set(label, resource);
		return this;
	}

	install() {
		for (const [label, resource] of this._pendingResources.entries()) {
			this._ecs.addResource(label, resource);
		}

		for (const system of this._pendingSystems) {
			this._ecs.addSystem(system);
		}

		this._pendingSystems = [];
		this._pendingResources.clear();

		return this._ecs;
	}
}