import type { Components, Events, Resources } from "@/types";
import { addSelectedEntity, removeSelectedEntity } from "@/ui-state";
import { pointInRectangle } from "@/utils";
import { Bundle } from "ecspresso";
import { Graphics, Rectangle } from 'pixi.js';

const DragThreshold = 10;

export default
function selectionBundle() {
	return new Bundle<Components, Events, Resources>()
	.addSystem('mouse-input')
	.setOnInitialize(({ resourceManager, entityManager, eventBus }) => {
		const pixi = resourceManager.get('pixi');
		const controlMap = resourceManager.get('activeKeyMap');
		const worldContainer = resourceManager.get('worldContainer');
		const uiContainer = resourceManager.get('uiContainer');

		// add drag-selection graphics to UI container
		let isDragging = false;
		let dragStartScreen: { x: number; y: number } | null = null;
		let dragStartWorld: { x: number; y: number } | null = null;

		const dragGraphics = new Graphics({
				visible: false,
			})
			.setFillStyle({
				color: 0x00FF00,
				alpha: 0.2,
			});
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

			// don't show drag box until movement passes threshold
			dragGraphics.visible = false;


			if(controlMap.control) return;

			const selectedEntities = entityManager.getEntitiesWithQuery(['selected', 'renderContainer']);

			for(const entity of selectedEntities) {
				eventBus.publish('deselectEntity', {
					entity,
					renderContainer: entity.components.renderContainer,
					selectedGraphic: entity.components.selected.graphic,
				});
			}
		});

		pixi.stage.on('pointermove', (event) => {
			if (!(dragStartScreen && dragStartWorld)) return;

			// calculate movement delta
			const dx = event.global.x - dragStartScreen.x;
			const dy = event.global.y - dragStartScreen.y;

			// only start dragging after threshold
			if (!isDragging) {
				if (Math.abs(dx) < DragThreshold && Math.abs(dy) < DragThreshold) {
					return;
				}
				isDragging = true;
				dragGraphics.visible = true;
			}

			// draw drag rectangle
			const { x: x1, y: y1 } = dragStartScreen;
			const x2 = event.global.x;
			const y2 = event.global.y;
			const rectX = Math.min(x1, x2);
			const rectY = Math.min(y1, y2);
			const rectW = Math.abs(x2 - x1);
			const rectH = Math.abs(y2 - y1);

			dragGraphics
				.clear()
				.rect(rectX, rectY, rectW, rectH)
				.fill();

			// dynamic selection toggle in world coords
			const worldEnd = event.getLocalPosition(worldContainer);
			const x1w = dragStartWorld.x;
			const y1w = dragStartWorld.y;
			const x2w = worldEnd.x;
			const y2w = worldEnd.y;
			const selXw = Math.min(x1w, x2w);
			const selYw = Math.min(y1w, y2w);
			const selWw = Math.abs(x2w - x1w);
			const selHw = Math.abs(y2w - y1w);

			for (const entity of entityManager.getEntitiesWithQuery(['selectable', 'renderContainer'])) {
				const bounds = entity.components.renderContainer.getBounds();
				const inside = bounds.x + bounds.width >= selXw && bounds.x <= selXw + selWw && bounds.y + bounds.height >= selYw && bounds.y <= selYw + selHw;

				if (inside) {
					// newly inside: select
					eventBus.publish('selectEntity', { entity: entity, renderContainer: entity.components.renderContainer });
				} else if (!inside) {
					// moved out: deselect if still selected
					if (entity.components.selected) {
						eventBus.publish('deselectEntity', {
							entity: entity,
							renderContainer: entity.components.renderContainer,
							selectedGraphic: entity.components.selected.graphic,
						});
					}
				}
			}
		});

		pixi.stage.on('pointerdown', (event) => {
			if (event.button !== 2) return;

			eventBus.publish('mouseRightClick', {
				point: event.getLocalPosition(worldContainer),
			});
			
		});

		pixi.stage.on('pointerup', (event) => {
			if (!dragStartScreen || !dragStartWorld) return;

			dragGraphics.visible = false;

			if (!isDragging) {
				// single click selection
				eventBus.publish('mouseLeftClick', {
					point: event.getLocalPosition(worldContainer)
				});
			}

			// reset drag state
			isDragging = false;
			dragStartScreen = null;
			dragStartWorld = null;
		});
	})
	.setEventHandlers({
		mouseLeftClick: {
			handler(data, { entityManager, eventBus }) {
				const { point } = data;

				for (const entity of entityManager.getEntitiesWithQuery(['selectable', 'renderContainer'])) {
					const rectangle = entity.components.renderContainer.getBounds();

					if (pointInRectangle(point, rectangle)) {
						const rc = entity.components.renderContainer;
						if (entity.components.selected) {
							eventBus.publish('deselectEntity', { entity, renderContainer: rc, selectedGraphic: entity.components.selected.graphic });
						} else {
							eventBus.publish('selectEntity', { entity, renderContainer: rc });
						}
						break;
					}
				}
			},
		},
		mouseRightClick: {
			handler(data, { entityManager, eventBus, resourceManager }) {
				const controlMap = resourceManager.get('activeKeyMap');
				const { point } = data;

				for (const entity of entityManager.getEntitiesWithQuery(['selected', 'moveable', 'position', 'renderContainer'])) {
					// assign move target and velocity
					eventBus.publish('setMoveTarget', {
						entity,
						queue: controlMap.shift,
						moveTarget: {
							...point,
						},
					});
				}

				for (const entity of entityManager.getEntitiesWithQuery(['selected', 'rallyPoint', 'renderContainer'])) {
					entityManager.addComponent(entity.id, 'rallyPoint', {
						...point
					});
				}
			},
		},
		selectEntity: {
			handler(data, { entityManager }) {
				// Add the "selected" component to the entity And add a circle graphic to the entity
				const {
					entity,
					renderContainer,
				} = data;

				if(entity.components.selected) return;

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

				if(!entity.components.selected) return;

				removeSelectedEntity(entity);
				entityManager.removeComponent(entity.id, 'selected');

				renderContainer.removeChild(selectedGraphic);
			},
		},
	})
	.bundle;


}