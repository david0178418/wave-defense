import type { Sprite } from "pixi.js";
import { Bundle } from "../../lib/simple-ecs";
import { EntityClassification, type GameOver } from "../../types";
import type { Invincible } from "../health.bundle";
import {
	DamageType,
	type DamageDealer,
	type DamageEffect,
	type Defense,
	type EntityCollision,
	type EntityDefeated,
	type Heath,
} from "./combat.bundle.types";



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

export
interface Events {
	entityDamaged: EntityDamaged;
	entityDefeated: EntityDefeated;
	entityCollision: EntityCollision;
	gameOver: GameOver;
}

export default
function damageEventsBundle() {
	return new Bundle<Components, Events>()
		.addSystem('damage-event-handler')
		.setEventHandlers({
			entityDamaged: {
				handler(data, entityManager, resourceManager, eventBus) {
					const { targetId, amount, type } = data;
					const target = entityManager.getEntity(targetId);
					
					if (!(target?.components.health && target.components.entityType)) return;
					
					// Check for invincibility
					if (target.components.invincible) return;
					
					// Check for defenses if they exist
					let damageAmount = amount;
					if (target.components.defense) {
						// Check immunities
						if (target.components.defense.immunities?.includes(type)) return;
						
						// Check invulnerability
						if (target.components.defense.invulnerable) return;
						
						// Apply resistance
						const resistance = target.components.defense.resistances?.[type as DamageType] || 0;
						damageAmount = Math.max(0, amount * (1 - resistance));
					}
					
					// Apply damage
					target.components.health.current -= damageAmount;
					
					// Add invincibility component if needed
					if (type !== DamageType.ENVIRONMENTAL) {
						entityManager.addComponent(targetId, 'invincible', {
							timer: 0,
							duration: 0.5
						});
						
						// Add damage effect if entity has a sprite
						if (target.components.sprite) {
							// Make sprite semi-transparent during invincibility
							const originalAlpha = target.components.sprite.alpha;
							target.components.sprite.alpha = 0.5;
							
							entityManager.addComponent(targetId, 'damageEffect', {
								timer: 0,
								duration: 0.5,
								originalAlpha,
								flashAlpha: 0.5
							});
						}
					}
					
					// Check for defeat
					if (target.components.health.current <= 0) {
						// Entity has been defeated
						const entityType = target.components.entityType;
						
						eventBus.publish('entityDefeated', {
							entityId: targetId,
							entityType
						});
					}
				}
			},
			
			entityDefeated: {
				handler(data, entityManager, resourceManager, eventBus) {
					const { entityId, entityType } = data;
					
					// Different logic based on entity type
					if (entityType === EntityClassification.PLAYER) {
						// Player death - trigger game over
						eventBus.publish('gameOver');
					} else {
						// Non-player entity death (like enemies)
						const entity = entityManager.getEntity(entityId);
						
						// Remove the sprite from the scene if it exists
						if (entity?.components.sprite) {
							const worldContainer = resourceManager.get('worldContainer');
							worldContainer.removeChild(entity.components.sprite);
						}
						
						// Remove the entity
						entityManager.removeEntity(entityId);
					}
				}
			},
			
			entityCollision: {
				handler(data, entityManager, resourceManager, eventBus) {
					const { entityA, entityB, entityAType, entityBType, isNew } = data;
					
					if (!isNew) return;
					
					if (
						(entityAType === EntityClassification.PLAYER && entityBType.toString().startsWith('ENEMY_')) ||
						(entityBType === EntityClassification.PLAYER && entityAType.toString().startsWith('ENEMY_'))
					) {
						const playerId = entityAType === EntityClassification.PLAYER ? entityA : entityB;
						const enemyId = entityAType === EntityClassification.PLAYER ? entityB : entityA;
						
						const enemy = entityManager.getEntity(enemyId);
						if (!enemy || !enemy.components.damageDealer) return;
						
						// Enemies damage player on contact
						eventBus.publish('entityDamaged', {
							targetId: playerId,
							sourceId: enemyId,
							amount: enemy.components.damageDealer.amount,
							type: enemy.components.damageDealer.type
						});
					}
				}
			}
		})
		.bundle;
}