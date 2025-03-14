import ECSpresso, { Bundle } from "ecspresso";
import { Application, Container, Graphics, Text } from "pixi.js";

interface Resources {
	pixi: Application,
	config: {
		mapSize: number;
	};
	worldContainer: Container;
	uiContainer: Container;
	healthText: Text;
}

interface Events {
	initializeGame: {
		game: typeof game;
	};
	initializeMap: true;
}


const game = new ECSpresso<{}, Events, Resources>();

game
	.addResource('config', {
		mapSize: 2000,
	})
	.addResource('worldContainer', new Container())
	.install(
		initializeGameBundle(),
	)
	.eventBus
	.publish('initializeGame', { game });



function initializeGameBundle() {
	return new Bundle<{}, Events, Resources>()

		.addSystem('initialize-game')
		.setEventHandlers({
			initializeGame: {
				async handler({ game }, entityManager, resourceManager, eventBus) {
					console.log("Initializing game");
					const pixi = new Application();

					await pixi.init({
						background: '#1099bb',
						resizeTo: window,
					});

					// Append the application canvas to the document body
					document.body.appendChild(pixi.canvas);

					pixi.ticker.add(ticker => {
						game.update(ticker.deltaMS / 1000);
					});

					// Create a container for the world (for camera movement)
					const worldContainer = new Container();
					pixi.stage.addChild(worldContainer);
					
					// Create UI container (fixed position, not affected by camera)
					const uiContainer = new Container();
					pixi.stage.addChild(uiContainer);
					
					// Create health display text
					const healthText = new Text('Health: 30/30', {
						fontFamily: 'Arial',
						fontSize: 24,
						fill: 0xffffff,
						align: 'left',
					});
					healthText.position.set(20, 20);
					uiContainer.addChild(healthText);
					
					// Update resources
					resourceManager.add('pixi', pixi);
					resourceManager.add('worldContainer', worldContainer);
					resourceManager.add('uiContainer', uiContainer);
					resourceManager.add('healthText', healthText);
					
					// Initialize map and player
					// eventBus.publish('initializeMap');
					// eventBus.publish('initializePlayer');
				},
			},
		})
		.bundle
		.addSystem('initialize-map')
		.setEventHandlers({
			initializeMap: {
				handler(data, entityManager, resourceManager, eventBus) {
					const worldContainer = resourceManager.get('worldContainer');
					const mapSize = resourceManager.get('config').mapSize;
					const map = new Container();
					
					// Create background and border with a Graphics object
					const background = new Graphics();
					background.fill({ color: 0x000000 }); // Black background
					background.setStrokeStyle({ width: 10, color: 0x00FF00 }); // 10px green border
					background.rect(0, 0, mapSize, mapSize);
					
					// Add background to map container
					map.addChild(background);
					
					// Add map to world container
					worldContainer.addChild(map);
				},
			},
		})
		.bundle;
}