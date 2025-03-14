import { Bundle } from "ecspresso";
import type { EntityType } from "../types";
import type { Collision, EntityCollision, Hitbox } from "./combat.bundle/combat.bundle.types";
import type { Position } from "./physics.bundle";


interface Components {
	position: Position;
	hitbox: Hitbox;
	collision: Collision;
	entityType: EntityType;
	player: true;
	enemy: true;
}

interface  Events {
	entityCollision: EntityCollision;
}

export default
function collisionBundle() {
	return new Bundle<Components, Events>()
		// Detect and process collisions between entities
		.addSystem('collision-detection')
		.addQuery('collidableEntities', {
			with: [
				'position',
				'hitbox',
				'entityType',
				'collision',
			],
		})
		.addQuery('playerEntities', {
			with: [
				'position',
				'hitbox',
				'entityType',
				'player',
			],
		})
		.addQuery('enemyEntities', {
			with: [
				'position',
				'hitbox',
				'entityType',
				'enemy',
			],
		})
		.setProcess((queries, deltaTime, entityManager, resourceManager, eventBus) => {
			const {
				collidableEntities,
				playerEntities,
				enemyEntities,
			} = queries;
			
			for (const entity of collidableEntities) {
				// Store previous collisions
				if (!entity.components.collision) {
					entityManager.addComponent(entity.id, 'collision', {
						collidingWith: [],
						wasColliding: []
					});
				} else {
					entity.components.collision.wasColliding = entity.components.collision.collidingWith;
					entity.components.collision.collidingWith = [];
				}
			}
			
			// Process player-enemy collisions first (most common case)
			for (const player of playerEntities) {
				const hitboxP = player.components.hitbox;
				const posP = player.components.position;
				const typeP = player.components.entityType;
				
				// Calculate player hitbox position
				const hitboxPX = posP.x + (hitboxP.offsetX || 0);
				const hitboxPY = posP.y + (hitboxP.offsetY || 0);
				const halfWidthP = hitboxP.width / 2;
				const halfHeightP = hitboxP.height / 2;
				
				for (const enemy of enemyEntities) {
					const hitboxE = enemy.components.hitbox;
					const posE = enemy.components.position;
					const typeE = enemy.components.entityType;
					
					// Calculate enemy hitbox position
					const hitboxEX = posE.x + (hitboxE.offsetX || 0);
					const hitboxEY = posE.y + (hitboxE.offsetY || 0);
					const halfWidthE = hitboxE.width / 2;
					const halfHeightE = hitboxE.height / 2;
					
					// Check for AABB collision
					const collisionX = Math.abs(hitboxPX - hitboxEX) < (halfWidthP + halfWidthE);
					const collisionY = Math.abs(hitboxPY - hitboxEY) < (halfHeightP + halfHeightE);
					
					if (collisionX && collisionY) {
						// Get or create collision components for both entities
						let playerCollision = player.components.collision;
						let enemyCollision = enemy.components.collision;
						
						if (!playerCollision) {
							playerCollision = { collidingWith: [], wasColliding: [] };
							entityManager.addComponent(player.id, 'collision', playerCollision);
						}
						
						if (!enemyCollision) {
							enemyCollision = { collidingWith: [], wasColliding: [] };
							entityManager.addComponent(enemy.id, 'collision', enemyCollision);
						}
						
						// Record collision
						playerCollision.collidingWith.push(enemy.id);
						enemyCollision.collidingWith.push(player.id);
						
						// Check if this is a new collision
						const isNewCollision = !playerCollision.wasColliding.includes(enemy.id) || 
							!enemyCollision.wasColliding.includes(player.id);
						
						// Publish a collision event
						eventBus.publish('entityCollision', {
							entityA: player.id,
							entityB: enemy.id,
							entityAType: typeP.type,
							entityBType: typeE.type,
							isNew: isNewCollision
						});
					}
				}
			}
			
		})
		.bundle;
}

