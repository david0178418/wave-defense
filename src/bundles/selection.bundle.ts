import type { Components, Events, Resources } from "@/types";
import { Bundle } from "ecspresso";
import { Graphics } from "pixi.js";

export
function selectionBundle() {
	return new Bundle<Components, Events, Resources>()
	.addSystem('selection')
	.setProcess((_data, _deltaTime, _entityManager, resourceManager, eventBus) => {
	})
	.setEventHandlers({
		selectEntity: {
			handler(data, entityManager, resourceManager, eventBus) {
				// Add the "selected" component to the entity And add a circle graphic to the entity
				const {
					entity,
					sprite,
				} = data;
				const selectedGraphic = new Graphics()
					.circle(0, 0, (sprite.width / 2) + 5)
					.stroke({
						color: 0xFF0000,
						width: 2,
					})
				entityManager.addComponent(entity, 'selected', {
					graphic: selectedGraphic,
				});
				sprite.addChild(selectedGraphic);
			},
		},
		deselect: {
			handler(data, entityManager, resourceManager, eventBus) {
				const {
					entity,
					sprite,
					selectedGraphic,
				} = data;
				entityManager.removeComponent(entity.id, 'selected');

				sprite.removeChild(selectedGraphic);
			},
		},
	})
	.bundle;
}