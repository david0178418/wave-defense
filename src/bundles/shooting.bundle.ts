import type { Components, Events, Resources, Vector2D } from "@/types";
import { Bundle, type Entity } from "ecspresso";
import { createProjectile } from "@/entities";
import { normalize } from "@/utils";

const PROJECTILE_SPEED = 400;

export default
function shootingBundle() {
	return new Bundle<Components, Events, Resources>()
		// --- System 1: Target Acquisition & Firing ---
		.addSystem('target-acquisition-and-firing')
		.addQuery('shooters', { with: ['shooter', 'position', 'playerUnitTag'] })
		.addQuery('targets', { with: ['enemyUnit', 'position'] })
		.setProcess((data, deltaTime, ecs) => {
			const allTargets = Array.from(data.targets);
			if (allTargets.length === 0) return; // No targets, nothing to shoot at

			for (const shooterEntity of data.shooters) {
				const shooter = shooterEntity.components.shooter!;
				const shooterPos = shooterEntity.components.position!;

				// Update cooldown
				shooter.cooldownTimer -= deltaTime;
				if (shooter.cooldownTimer > 0) continue; // Still cooling down

				// Find nearest target in range
				let nearestTarget: Entity<Components> | null = null;
				let minDistanceSq = shooter.range * shooter.range;

				for (const targetEntity of allTargets) {
					const targetPos = targetEntity.components.position!;
					const dx = targetPos.x - shooterPos.x;
					const dy = targetPos.y - shooterPos.y;
					const distanceSq = dx * dx + dy * dy;

					if (distanceSq <= minDistanceSq) {
						minDistanceSq = distanceSq;
						nearestTarget = targetEntity;
					}
				}

				// Fire if target found
				if (nearestTarget) {
					// Reset cooldown
					shooter.cooldownTimer = 1 / shooter.attackSpeed;

					// Calculate direction and velocity
					const targetPos = nearestTarget.components.position!;
					const direction = normalize({ x: targetPos.x - shooterPos.x, y: targetPos.y - shooterPos.y });
					const velocity = { x: direction.x * PROJECTILE_SPEED, y: direction.y * PROJECTILE_SPEED };

					// Create projectile
					createProjectile(shooterPos, velocity, shooter.projectileDamage, ecs);
				}
			}
		})
		.bundle
		// --- System 2: Projectile Movement ---
		.addSystem('move-by-velocity')
		.addQuery('movingProjectiles', { with: ['position', 'velocity'] })
		.setProcess((data, deltaTime) => {
			for (const entity of data.movingProjectiles) {
				const pos = entity.components.position!;
				const vel = entity.components.velocity!;
				pos.x += vel.x * deltaTime;
				pos.y += vel.y * deltaTime;
			}
		})
		.bundle
		// --- System 3: Cleanup Offscreen Projectiles ---
		.addSystem('cleanup-offscreen-projectiles')
		.addQuery('projectilesToCheck', { with: ['projectile', 'position'], without: ['toBeRemoved'] })
		.setProcess((data, _deltaTime, { resourceManager, entityManager }) => {
			const mapSize = resourceManager.get('config').mapSize;
			const cleanupBuffer = 100; // Extra buffer just in case

			for (const entity of data.projectilesToCheck) {
				const pos = entity.components.position!;
				if (
					pos.x < -cleanupBuffer || 
					pos.x > mapSize.width + cleanupBuffer ||
					pos.y < -cleanupBuffer ||
					pos.y > mapSize.height + cleanupBuffer
				) {
					entityManager.addComponent(entity.id, 'toBeRemoved', true);
				}
			}
		})
		.bundle;
} 