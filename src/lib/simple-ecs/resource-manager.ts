export default
class ResourceManager<ResourceTypes> {
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
