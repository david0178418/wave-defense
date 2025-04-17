import type { Entity } from "ecspresso";
import { atom, createStore, useAtomValue } from "jotai"
import type { Components, Events, Resources } from "./types";
import type ECSpresso from "ecspresso";

export const store = createStore();

export const ecsAtom = atom<ECSpresso<Components, Events, Resources> | null>(null);

export const selectedEntitiesAtom = atom<Entity<Components>[]>([]);

export function useSelectedEntities() {
	return useAtomValue(selectedEntitiesAtom);
}

export function addSelectedEntity(entity: Entity<Components>) {
	const currentEntities = store.get(selectedEntitiesAtom);
	store.set(selectedEntitiesAtom, [...currentEntities, entity]);
}

export function removeSelectedEntity(entity: Entity<Components>) {
	const currentEntities = store.get(selectedEntitiesAtom);

	if(!currentEntities.find(e => e.id === entity.id)) return;

	if(!entity.components.selected) return;

	store.set(selectedEntitiesAtom, currentEntities.filter(e => e.id !== entity.id));

	store
		.get(ecsAtom)
		?.eventBus
		.publish('deselectEntity', {
			entity,
			renderContainer: entity.components.renderContainer!,
			selectedGraphic: entity.components.selected?.graphic!,
		});
}
