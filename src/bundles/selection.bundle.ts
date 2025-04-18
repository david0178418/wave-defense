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
		const uiContainer = resourceManager.get('uiContainer');

		// add drag-selection graphics to UI container
		let isDragging = false;
		let dragStartScreen: { x: number; y: number } | null = null;
		let dragStartWorld: { x: number; y: number } | null = null;
		const dragGraphics = new Graphics();
		dragGraphics.visible = false;
		uiContainer.addChild(dragGraphics);

		// make stage interactive and cover full screen
		pixi.stage.interactive = true;
		pixi.stage.hitArea = new Rectangle(0, 0, pixi.screen.width, pixi.screen.height);

		pixi.stage.on('pointerdown', (event) => {
			if (event.button !== 0) return;
			isDragging = false;
			// record start in screen and world space
			dragStartScreen = { x: event.global.x, y: event.global.y };
			const worldPos = event.getLocalPosition(worldContainer);
			dragStartWorld = { x: worldPos.x, y: worldPos.y };
			dragGraphics.clear();
			dragGraphics.visible = true;
		});

		pixi.stage.on('pointermove', (event) => {
			if (!dragStartScreen) return;
			isDragging = true;
			const { x: x1, y: y1 } = dragStartScreen;
			const x2 = event.global.x;
			const y2 = event.global.y;
			const rectX = Math.min(x1, x2);
			const rectY = Math.min(y1, y2);
			const rectW = Math.abs(x2 - x1);
			const rectH = Math.abs(y2 - y1);
			dragGraphics.clear();
			dragGraphics.lineStyle(1, 0x00FF00, 1);
			dragGraphics.beginFill(0x00FF00, 0.2);
			dragGraphics.drawRect(rectX, rectY, rectW, rectH);
			dragGraphics.endFill();
		});

		pixi.stage.on('pointerup', (event) => {
			if (!dragStartScreen || !dragStartWorld) return;
			dragGraphics.clear();
			dragGraphics.visible = false;
			const worldEnd = event.getLocalPosition(worldContainer);

			if (isDragging) {
				// clear previous selections
				for (const sel of entityManager.getEntitiesWithComponents(['selected', 'renderContainer'])) {
					const rc = sel.components.renderContainer;
					const sg = sel.components.selected.graphic;
					eventBus.publish('deselectEntity', { entity: sel, renderContainer: rc, selectedGraphic: sg });
				}
				// compute selection box in world coords
				const x1 = dragStartWorld.x;
				const y1 = dragStartWorld.y;
				const x2 = worldEnd.x;
				const y2 = worldEnd.y;
				const selX = Math.min(x1, x2);
				const selY = Math.min(y1, y2);
				const selW = Math.abs(x2 - x1);
				const selH = Math.abs(y2 - y1);
				// select entities inside box
				for (const ent of entityManager.getEntitiesWithComponents(['selectable', 'clickBounds', 'renderContainer'])) {
					const b = ent.components.clickBounds;
					if (b.x + b.width >= selX && b.x <= selX + selW && b.y + b.height >= selY && b.y <= selY + selH) {
						const rc2 = ent.components.renderContainer;
						if (!ent.components.selected) {
							eventBus.publish('selectEntity', { entity: ent, renderContainer: rc2 });
						}
					}
				}
			} else {
				// single click selection
				const { x, y } = event.getLocalPosition(worldContainer);
				for (const ent of entityManager.getEntitiesWithComponents(['selectable', 'clickBounds', 'renderContainer'])) {
					const b = ent.components.clickBounds;
					if (x >= b.x && x <= b.x + b.width && y >= b.y && y <= b.y + b.height) {
						const rc3 = ent.components.renderContainer;
						if (ent.components.selected) {
							eventBus.publish('deselectEntity', { entity: ent, renderContainer: rc3, selectedGraphic: ent.components.selected.graphic });
						} else {
							eventBus.publish('selectEntity', { entity: ent, renderContainer: rc3 });
						}
						break;
					}
				}
			}
			// reset drag state
			isDragging = false;
			dragStartScreen = null;
			dragStartWorld = null;
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
			handler(data, { entityManager }) {
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