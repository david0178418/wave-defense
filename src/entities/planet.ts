import type { Game } from "@/types";
import { sciFiNameGenerator } from "@/utils";
import { Graphics, Sprite } from "pixi.js";

export default
function createPlanet(x: number, y: number, radius: number, color: number, ecs: Game) {
	const {
		resourceManager,
		entityManager,
	} = ecs;
	const entity = entityManager.createEntity();

	const graphics = new Graphics()
		.circle(0, 0, radius)
		.fill(color);
			
	const texture = resourceManager.get('pixi').renderer.generateTexture(graphics);
	const sprite = new Sprite(texture);
	
	sprite.x = x;
	sprite.y = y;
	sprite.anchor.set(0.5);
	
	sprite.interactive = true;
	sprite.cursor = 'pointer';
	sprite.on('mouseenter', () => {
		sprite.scale.set(1.1);
	});

	sprite.on('mouseleave', () => {
		sprite.scale.set(1);
	});

	entityManager
		.addComponent(entity, 'renderLayer', 'foreground')
		.addComponent(entity, 'selectable', true)
		.addComponent(entity, 'position', { x, y })
		.addComponent(entity, 'name', sciFiNameGenerator.generate());

	return entity;
}
