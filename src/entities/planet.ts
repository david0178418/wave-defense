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
			
	// Convert graphics to texture and create sprite
	const texture = resourceManager.get('pixi').renderer.generateTexture(graphics);
	const sprite = new Sprite(texture);
	
	// Position the sprite (as graphics was centered at 0,0)
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

	// manual click listener removed; selectionBundle now handles pointer events

	entityManager
		.addComponent(entity, 'renderLayer', 'foreground')
		.addComponent(entity, 'selectable', true)
		.addComponent(entity, 'position', { x, y })
		.addComponent(entity, 'name', sciFiNameGenerator.generate())
		.addComponent(entity, 'clickBounds', {
			x: x - radius,
			y: y - radius,
			width: radius * 2,
			height: radius * 2,
		});

	// sprite mounting is now managed by the render system

	return entity;
}
