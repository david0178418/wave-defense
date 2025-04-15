import { Bundle } from 'ecspresso';
import { Graphics } from 'pixi.js';
import { randomInt, range } from '@/utils';
import type { Components, Events, Resources } from '@/types';
import createPlanet from '@/entities/planet';

export function mapInitializationBundle() {
	return new Bundle<Components, Events, Resources>()
		.addSystem('initialize-map')
		.setEventHandlers({
			initializeMap: {
				handler(_data, ecs) {
					const { resourceManager } = ecs;
					const { mapSize } = resourceManager.get('config');
					const background = resourceManager.get('background');

					// Initialize map background
					background.addChild(
						new Graphics()
							.rect(
								0,
								0,
								mapSize.width,
								mapSize.height,
							)
							.fill(0x873e23)
					);

					// Sprinkle stars about
					range(100).forEach(() => {
						const x = randomInt(mapSize.width);
						const y = randomInt(mapSize.height);
						
						background.addChild(
							new Graphics()
								.circle(x, y, randomInt(2, 5))
								.fill(0xFFFFFF)
						);
					});

					// Create planets
					const edgeBuffer = 100;
					range(10).forEach(() => {
						createPlanet(
							randomInt(edgeBuffer, mapSize.width - edgeBuffer), 
							randomInt(edgeBuffer, mapSize.height - edgeBuffer),
							randomInt(20, 60),
							randomInt(0xFFFFFF),
							ecs,
						);
					});
				},
			},
		})
		.bundle;
} 