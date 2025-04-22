import type { Components, Events, Resources } from '@/types';
import { Bundle } from 'ecspresso';
import type { Container } from 'pixi.js';

export default
function renderBundle() {
	return new Bundle<Components, Events, Resources>()
		.addSystem('render')
		.setOnInitialize(({ entityManager, resourceManager }) => {
			const layers: Record<Components['renderLayer'], Container> = {
				background: resourceManager.get('background'),
				foreground: resourceManager.get('foreground'),
				uiContainer: resourceManager.get('uiContainer'),
				mapContainer: resourceManager.get('mapContainer'),
				worldContainer: resourceManager.get('worldContainer'),
			} as const;

			// mount existing sprites
			for (const entity of entityManager.getEntitiesWithQuery(['renderContainer', 'renderLayer'])) {
				const renderContainer = entity.components.renderContainer;
				const layer = entity.components.renderLayer;
				layers[layer].addChild(renderContainer);

			}

			// automatically mount/dismount
			entityManager.onComponentAdded('renderLayer', (layer, entity) => { 
				const renderContainer = entity.components.renderContainer;

				if (!renderContainer) return;

				layers[layer].addChild(renderContainer);
			});

			entityManager.onComponentRemoved('renderContainer', (renderContainer) => {
				renderContainer.parent?.removeChild(renderContainer);
				renderContainer.destroy({ texture: true, textureSource: true, children: true });
			});
		})
		.bundle;
}
