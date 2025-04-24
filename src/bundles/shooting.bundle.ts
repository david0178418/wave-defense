import type { Components, Events, Resources, Vector2D } from "@/types";
import { Bundle, type Entity } from "ecspresso";
import { createProjectile } from "@/entities";
import { normalize, dot } from "@/utils";

const PROJECTILE_SPEED = 400;

// Function to solve quadratic: ax^2 + bx + c = 0
// Returns the smallest positive real root, or null if none exists.
function solveQuadraticForSmallestPositive(a: number, b: number, c: number): number | null {
	if (Math.abs(a) < 1e-6) { // Handle linear equation case (a is close to zero)
		if (Math.abs(b) < 1e-6) return null; // No solution or infinite solutions
		const t = -c / b;
		return t > 0 ? t : null;
	}

	const discriminant = b * b - 4 * a * c;
	if (discriminant < 0) return null; // No real roots

	const sqrtDiscriminant = Math.sqrt(discriminant);
	const t1 = (-b + sqrtDiscriminant) / (2 * a);
	const t2 = (-b - sqrtDiscriminant) / (2 * a);

	if (t1 > 0 && t2 > 0) return Math.min(t1, t2);
	if (t1 > 0) return t1;
	if (t2 > 0) return t2;
	return null;
}

export default
function shootingBundle() {
	return new Bundle<Components, Events, Resources>()
		// --- System 1: Target Acquisition & Firing ---
		.addSystem('target-acquisition-and-firing')
		.addQuery('shooters', { with: ['weaponSlots', 'position', 'playerUnitTag'] })
		.addQuery('targets', { with: ['enemyUnit', 'position', 'speed'] })
		.setProcess((data, deltaTime, ecs) => {
			const allTargets = Array.from(data.targets);
			if (allTargets.length === 0) return;

			for (const shooterEntity of data.shooters) {
				const weaponSlots = shooterEntity.components.weaponSlots!;
				const shooterPos = shooterEntity.components.position!;

				// Iterate through each weapon slot
				for (const weapon of weaponSlots.slots) {
					// Update cooldown for this weapon
					weapon.cooldownTimer -= deltaTime;
					if (weapon.cooldownTimer > 0) continue; // This weapon is cooling down

					// Find nearest target in *this weapon's* range
					let nearestTarget: Entity<Components> | null = null;
					let minDistanceSq = weapon.range * weapon.range;

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

					// Fire if target found for this weapon
					if (nearestTarget) {
						// Reset cooldown for *this weapon*
						weapon.cooldownTimer = 1 / weapon.attackSpeed;

						// --- Target Leading Logic (using this weapon's range/damage) ---
						const targetPos = nearestTarget.components.position!;
						const targetSpeed = nearestTarget.components.speed!;
						const targetMoveTarget = nearestTarget.components.moveTarget;

						let targetVel: Vector2D = { x: 0, y: 0 };
						if (targetMoveTarget) {
							const dirToMoveTarget = normalize({ x: targetMoveTarget.x - targetPos.x, y: targetMoveTarget.y - targetPos.y });
							targetVel = { x: dirToMoveTarget.x * targetSpeed, y: dirToMoveTarget.y * targetSpeed };
						}

						let firingDirection: Vector2D;
						const shooterToTarget = { x: targetPos.x - shooterPos.x, y: targetPos.y - shooterPos.y };
						const a = dot(targetVel, targetVel) - PROJECTILE_SPEED * PROJECTILE_SPEED;
						const b = 2 * dot(shooterToTarget, targetVel);
						const c = dot(shooterToTarget, shooterToTarget);
						const predictedTime = solveQuadraticForSmallestPositive(a, b, c);

						if (predictedTime !== null) {
							const interceptX = targetPos.x + targetVel.x * predictedTime;
							const interceptY = targetPos.y + targetVel.y * predictedTime;
							firingDirection = normalize({ x: interceptX - shooterPos.x, y: interceptY - shooterPos.y });
						} else {
							firingDirection = normalize(shooterToTarget);
						}
						// --- End Target Leading Logic ---

						const velocity = { x: firingDirection.x * PROJECTILE_SPEED, y: firingDirection.y * PROJECTILE_SPEED };
						
						// Generate graphic using the weapon's function
						const projectileGraphic = weapon.projectileGraphicFn();

						// Create projectile, passing the specific graphic and damage
						createProjectile(shooterPos, velocity, weapon.projectileDamage, projectileGraphic, ecs);
					}
				} // End loop through weapons
			} // End loop through shooters
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