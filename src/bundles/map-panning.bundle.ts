import { Bundle } from 'ecspresso';

export function mapPanningBundle() {
	return new Bundle<Components, Events, Resources>()
		.addSystem('map-panning')
		.setProcess((_data, _deltaTime, _entityManager, resourceManager, _eventBus) => {
			const worldContainer = resourceManager.get('worldContainer');
			const keyMap = resourceManager.get('activeKeyMap');
			const pixi = resourceManager.get('pixi');
			const {
				mapSize,
				panSpeed,
			} = resourceManager.get('config');
			
			const panAmount = panSpeed * pixi.ticker.deltaMS / 1000;
			
			let worldX = worldContainer.position.x;
			let worldY = worldContainer.position.y;
			
			const viewWidth = pixi.screen.width;
			const viewHeight = pixi.screen.height;
			
			if (keyMap.up) {
				worldY += panAmount;
			}
			if (keyMap.down) {
				worldY -= panAmount;
			}
			if (keyMap.left) {
				worldX += panAmount;
			}
			if (keyMap.right) {
				worldX -= panAmount;
			}
			
			const minX = -(mapSize - viewWidth);
			const minY = -(mapSize - viewHeight);
			const maxX = 0;
			const maxY = 0;
			
			worldX = Math.max(minX, Math.min(maxX, worldX));
			worldY = Math.max(minY, Math.min(maxY, worldY));
			
			worldContainer.position.set(worldX, worldY);
		})
		.bundle;
} 