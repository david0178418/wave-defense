import type { Components, Events, Resources } from "@/types";
import { addSelectedEntity, removeSelectedEntity } from "@/ui-state";
import { Bundle } from "ecspresso";
import { Graphics, Rectangle } from 'pixi.js';

export
function selectionBundle() {
	return new Bundle<Components, Events, Resources>()
	.addSystem('selection')
	.setOnInitialize(({ resourceManager, entityManager, eventBus }) => {
		const pixi = resourceManager.get('pixi');
		const worldContainer = resourceManager.get('worldContainer');
		// make stage interactive and cover full screen
		pixi.stage.interactive = true;
		pixi.stage.hitArea = new Rectangle(0, 0, pixi.screen.width, pixi.screen.height);
		pixi.stage.on('pointerdown', (event) => {
			const { x, y } = event.getLocalPosition(worldContainer);

			for (const entity of entityManager.getEntitiesWithComponents(['selectable','clickBounds', 'renderContainer'])) {
				const bounds = entity.components.clickBounds;
				if (x >= bounds.x && x <= bounds.x + bounds.width && y >= bounds.y && y <= bounds.y + bounds.height) {
					const renderContainer = entity.components.renderContainer;

					if (entity.components['selected']) {
						eventBus.publish('deselectEntity', { entity, renderContainer, selectedGraphic: entity.components['selected'].graphic });
					} else {
						eventBus.publish('selectEntity', { entity, renderContainer });
					}
					break;
				}
			}
		});
	})
	.setEventHandlers({
		selectEntity: {
			handler(data, { entityManager }) {
				// Add the "selected" component to the entity And add a circle graphic to the entity
				const {
					entity,
					renderContainer,
				} = data;

				const selectedGraphic = new Graphics()
					.circle(0, 0, (renderContainer.width / 2) + 5)
					.stroke({
						color: 0xFF0000,
						width: 2,
					});
				entityManager.addComponent(entity, 'selected', {
					graphic: selectedGraphic,
				});
				renderContainer.addChild(selectedGraphic);
				addSelectedEntity(entity);
			},
		},
		deselectEntity: {
			handler(data, {entityManager}) {
				const {
					entity,
					renderContainer,
					selectedGraphic,
				} = data;

				removeSelectedEntity(entity);
				entityManager.removeComponent(entity.id, 'selected');

				renderContainer.removeChild(selectedGraphic);
			},
		},
	})
	.bundle;
}