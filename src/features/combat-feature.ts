import type { Sprite } from "pixi.js";
import { Bundle } from "../lib/simple-ecs";
import { EntityClassification, type GameOver } from "../types";
import type { EntityCollision } from "./collision-feature";
import type { Invincible } from "./health-feature";
// Define damage types for different attack sources
export
enum DamageType {
	PHYSICAL = 'physical',
	PROJECTILE = 'projectile',
	ENVIRONMENTAL = 'environmental',
	// Add more as needed
}

export
interface Heath {
	current: number;
	max: number;
}

export
interface DamageDealer {
	amount: number;
	type: DamageType;
}

export
interface Defense {
	resistances: Partial<Record<DamageType, number>>; // 0-1 values where 1 is 100% resistance
	immunities: DamageType[];
	invulnerable: boolean;
	invulnerabilityTimer?: number;
}

export
interface DamageEffect {
	timer: number;
	duration: number;
	originalAlpha: number;
	flashAlpha: number;
}

export
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

interface EntityDefeated {
	entityId: number;
	entityType: EntityClassification;
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
function combatFeature() {
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
		.bundle
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
		.bundle
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
			
			// Handle collision events that should cause damage
			entityCollision: {
				handler(data, entityManager, resourceManager, eventBus) {
					const { entityA, entityB, entityAType, entityBType, isNew } = data;
					
					// If this isn't a new collision, we don't want to apply damage again
					if (!isNew) return;
					
					// Handle player-enemy collisions
					if (
						(entityAType === EntityClassification.PLAYER && entityBType.toString().startsWith('ENEMY_')) ||
						(entityBType === EntityClassification.PLAYER && entityAType.toString().startsWith('ENEMY_'))
					) {
						const playerId = entityAType === EntityClassification.PLAYER ? entityA : entityB;
						const enemyId = entityAType === EntityClassification.PLAYER ? entityB : entityA;
						
						// Get the enemy to determine damage amount
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
					
					// Additional collision-to-damage handlers can be added here
					// For example: player projectiles hitting enemies, etc.
				}
			}
		})
		.bundle;
} 