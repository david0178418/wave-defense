import { Bundle, ResourceManager } from 'ecspresso';
import { Application, Container, Graphics } from 'pixi.js';
import type { ActiveControlMap, Components, Events, Resources } from '@/types';
import bootstrapUI from '@/bootstrap-ui';

export default
function initializeGameBundle() {
	return new Bundle<Components, Events, Resources>()
		.addResource('activeKeyMap', createActiveKeyMap)
		.addResource('worldContainer', new Container())
		.addResource('background', new Container())
		.addResource('uiContainer', new Container())
		.addResource('foreground', new Container({isRenderGroup: true}))
		.addResource('mapContainer', new Container({ isRenderGroup: true }))
		.addResource('pixi', async (ecs) => {
			const { screenSize } = ecs.resourceManager.get('config');
			const pixi = new Application();
			
			await pixi.init({
				background: '#1099bb',
				width: screenSize.width,
				height: screenSize.height,
				autoDensity: true,
			});

			pixi.canvas.addEventListener('contextmenu', event => event.preventDefault());

			return pixi;
		})
		.addSystem('initialize-game')
		.setOnInitialize(async (ecs) => {
			const { resourceManager } = ecs;
			const pixi = resourceManager.get('pixi');
			const config = resourceManager.get('config');

			await setupRenderGraph(resourceManager);
			
			bootstrapUI(ecs);

			setupResponsiveScaling(pixi, config.screenSize.width, config.screenSize.height);

		})
		.setEventHandlers({
			startGame: {
				async handler(_data, ecs) {
					const pixi = ecs.resourceManager.get('pixi');

					pixi.ticker.add(ticker => {
						ecs.update(ticker.deltaMS / 1_000);
					});
					
					ecs.eventBus.publish('initializeMap');
					ecs.eventBus.publish('initializePlayer');
				},
			},
		})
		.bundle;
}

/**
 * Sets up responsive scaling for the game canvas
 */
function setupResponsiveScaling(pixi: Application, gameWidth: number, gameHeight: number) {
	const resize = () => {
		const screenWidth = window.innerWidth;
		const screenHeight = window.innerHeight;

		// Calculate scale to fit the window while maintaining aspect ratio
		const scale = Math.min(
			screenWidth / gameWidth,
			screenHeight / gameHeight
		);

		// Center the app on screen
		pixi.canvas.style.width = `${gameWidth * scale}px`;
		pixi.canvas.style.height = `${gameHeight * scale}px`;
		pixi.canvas.style.position = 'absolute';
		pixi.canvas.style.left = `${(screenWidth - gameWidth * scale) / 2}px`;
		pixi.canvas.style.top = `${(screenHeight - gameHeight * scale) / 2}px`;
	};

	// Initial resize
	resize();

	// Update the canvas size when the window is resized
	window.addEventListener('resize', resize);
}

function createActiveKeyMap(): ActiveControlMap {
	const controlMap = {
		up: false,
		down: false,
		left: false,
		right: false,
		control: false,
		shift: false,
	};

	window.addEventListener('keydown', (event) => {
		switch(event.key) {
			case 'w':
			case 'ArrowUp':
				controlMap.up = true;
				break;
			case 's':
			case 'ArrowDown':
				controlMap.down = true;
				break;
			case 'a':
			case 'ArrowLeft':
				controlMap.left = true;
				break;
			case 'd':
			case 'ArrowRight':
				controlMap.right = true;
				break;
			case 'Control':
				controlMap.control = true;
				break;
			case 'Shift':
				controlMap.shift = true;
				break;
		}
	});

	window.addEventListener('keyup', (event) => {
		switch(event.key) {
			case 'w':
			case 'ArrowUp':
				controlMap.up = false;
				break;
			case 's':
			case 'ArrowDown':
				controlMap.down = false;
				break;
			case 'a':
			case 'ArrowLeft':
				controlMap.left = false;
				break;
			case 'd':
			case 'ArrowRight':
				controlMap.right = false;
				break;
			case 'Control':
				controlMap.control = false;
				break;
			case 'Shift':
				controlMap.shift = false;
				break;
		}
	});

	return controlMap;
}

async function setupRenderGraph(resourceManager: ResourceManager<Resources>) {
	const pixi = resourceManager.get('pixi');
	const config = resourceManager.get('config');

	const worldContainer = resourceManager.get('worldContainer');
	const mapContainer = resourceManager.get('mapContainer');
	const background = resourceManager.get('background');
	const foreground = resourceManager.get('foreground');
	const uiContainer = resourceManager.get('uiContainer');

	background.addChild(
		new Graphics()
			.rect(
				0,
				0,
				config.mapSize.width,
				config.mapSize.height,
			)
			.fill(0x873e23)
	);

	mapContainer.addChild(background);
	mapContainer.addChild(foreground);
	worldContainer.addChild(mapContainer);

	pixi.stage.addChild(worldContainer);
	pixi.stage.addChild(uiContainer);
}