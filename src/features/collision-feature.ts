import SimpleECS, { Feature } from "../lib/simple-ecs";
import type { Components, Resources, Events } from "../types";
import { EntityType } from "./entity-type-feature";

// Collision component interface
export
interface CollisionComponents {
	// Hitbox for collision detection
	hitbox: {
		width: number;
		height: number;
		offsetX?: number;
		offsetY?: number;
		isTrigger?: boolean; // If true, detects but doesn't block
	};
	
	// For storing collision state
	collision: {
		collidingWith: number[]; // IDs of entities currently colliding with
		wasColliding: number[]; // IDs of entities colliding in previous frame
	};
}

// Collision events
export
interface CollisionEvents {
	// Generic event fired when entities collide
	entityCollision: {
		entityA: number;
		entityB: number;
		entityAType: EntityType;
		entityBType: EntityType;
		isNew: boolean; // Whether this is a new collision or ongoing
	};
}

export default
function collisionFeature(game: SimpleECS<Components, Events, Resources>) {
	return new Feature<Components, Events, Resources>(game)
		// Detect and process collisions between entities
		.addSystem({
			label: "collision-detection",
			with: [
				'position',
				'hitbox',
				'entityType', // Require entity type for faction checking
			],
			process(entities, deltaTime, entityManager, resourceManager, eventBus) {
				// Clear previous frame collisions first
				for (const entity of entities) {
					// Initialize collision component if needed
					if (!entity.components.collision) {
						entityManager.addComponent(entity.id, 'collision', {
							collidingWith: [],
							wasColliding: []
						});
					} else {
						// Store previous collisions
						entity.components.collision.wasColliding = [...entity.components.collision.collidingWith];
						entity.components.collision.collidingWith = [];
					}
				}
				
				// Check each pair of entities for collisions
				for (let i = 0; i < entities.length; i++) {
					const entityA = entities[i];
					if (!entityA) continue;
					
					const hitboxA = entityA.components.hitbox;
					const posA = entityA.components.position;
					const typeA = entityA.components.entityType;
					
					// Calculate actual hitbox position (center + offset)
					const hitboxAX = posA.x + (hitboxA.offsetX || 0);
					const hitboxAY = posA.y + (hitboxA.offsetY || 0);
					const halfWidthA = hitboxA.width / 2;
					const halfHeightA = hitboxA.height / 2;
					
					for (let j = i + 1; j < entities.length; j++) {
						const entityB = entities[j];
						if (!entityB) continue;
						
						const hitboxB = entityB.components.hitbox;
						const posB = entityB.components.position;
						const typeB = entityB.components.entityType;
						
						// Skip collisions between entities of the same faction
						if (typeA.faction === typeB.faction) continue;
						
						// Calculate actual hitbox position (center + offset)
						const hitboxBX = posB.x + (hitboxB.offsetX || 0);
						const hitboxBY = posB.y + (hitboxB.offsetY || 0);
						const halfWidthB = hitboxB.width / 2;
						const halfHeightB = hitboxB.height / 2;
						
						// Check for AABB collision
						const collisionX = Math.abs(hitboxAX - hitboxBX) < (halfWidthA + halfWidthB);
						const collisionY = Math.abs(hitboxAY - hitboxBY) < (halfHeightA + halfHeightB);
						
						if (collisionX && collisionY) {
							// Record collision
							if (entityA.components.collision && entityB.components.collision) {
								entityA.components.collision.collidingWith.push(entityB.id);
								entityB.components.collision.collidingWith.push(entityA.id);
								
								// Check if this is a new collision (not in wasColliding)
								const isNewCollisionForA = !entityA.components.collision.wasColliding.includes(entityB.id);
								const isNewCollisionForB = !entityB.components.collision.wasColliding.includes(entityA.id);
								const isNewCollision = isNewCollisionForA || isNewCollisionForB;
								
								// Publish a generic collision event
								eventBus.publish('entityCollision', {
									entityA: entityA.id,
									entityB: entityB.id,
									entityAType: typeA.type,
									entityBType: typeB.type,
									isNew: isNewCollision
								});
							}
						}
					}
				}
			}
		})
		.install();
} 