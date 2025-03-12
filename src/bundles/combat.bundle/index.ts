import type { Sprite } from "pixi.js";
import { Bundle } from "../../lib/simple-ecs";
import { EntityClassification, type GameOver } from "../../types";
import type { Invincible } from "../health.bundle";
import damageEventsBundle from "./damage-events.bundle";
import type {
	DamageDealer,
	DamageEffect,
	DamageType,
	Defense,
	EntityCollision,
	EntityDefeated,
	Heath,
} from "./combat.bundle.types";
import { mergeBundles } from "../../lib/simple-ecs/bundle";

interface Components {
	health: Heath;
	damageDealer: DamageDealer;
	position: Position;
	sprite: Sprite;
	entityType: EntityClassification;
	defense: Defense;
	invincible: Invincible;
	damageEffect: DamageEffect;
}

interface EntityDamaged {
	targetId: number;
	sourceId?: number;
	amount: number;
	type: DamageType;
}

// Event type for damage events
export
interface Events {
	entityDamaged: EntityDamaged;
	entityDefeated: EntityDefeated;
	entityCollision: EntityCollision;
	gameOver: GameOver;
}

export default
function combatBundle() {
	return mergeBundles(
		'combat',
		damageDealingBundle(),
		damageEffectsBundle(),
		damageEventsBundle(),
	);
}

function damageDealingBundle() {
	return new Bundle<Components, Events>()
		// Process damage application
		.addSystem('damage-dealing')
		.addQuery('damageDealers', {
			with: ['position', 'sprite', 'damageDealer']
		})
		.setProcess((queries, deltaTime, entityManager, resourceManager, eventBus) => {
			// This system is kept as a placeholder for future damage dealing logic
			// It currently doesn't do anything since we removed the cooldown logic
			// But keeping the system allows us to easily reintroduce functionality later
		})
		.bundle;
}

function damageEffectsBundle() {
	return new Bundle<Components, Events>()
		// Handles damage effects like invincibility and visual feedback
		.addSystem('damage-effects')
		.addQuery('invincibleEntities', {
			with: ['sprite', 'invincible']
		})
		.addQuery('damageEffectEntities', {
			with: ['sprite', 'damageEffect']
		})
		.setProcess((queries, deltaTime, entityManager) => {
			// Process invincibility
			for (const entity of queries.invincibleEntities) {
				entity.components.invincible.timer += deltaTime;
				
				// End invincibility when duration is over
				if (entity.components.invincible.timer >= entity.components.invincible.duration) {
					entityManager.removeComponent(entity.id, 'invincible');
					entity.components.sprite.alpha = 1.0; // Restore full opacity
				}
			}
			
			// Process visual damage effects (flashing, etc.)
			for (const entity of queries.damageEffectEntities) {
				entity.components.damageEffect.timer += deltaTime;
				
				// Flash the entity by alternating alpha
				const phase = Math.sin(entity.components.damageEffect.timer * 30) * 0.5 + 0.5;
				entity.components.sprite.alpha = entity.components.damageEffect.originalAlpha +
					(entity.components.damageEffect.flashAlpha - entity.components.damageEffect.originalAlpha) * phase;
				
				// End effect when duration is over
				if (entity.components.damageEffect.timer >= entity.components.damageEffect.duration) {
					entityManager.removeComponent(entity.id, 'damageEffect');
					entity.components.sprite.alpha = entity.components.damageEffect.originalAlpha;
				}
			}
		})
		.bundle;
}