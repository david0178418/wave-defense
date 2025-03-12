import { EntityClassification, type Enum } from "../../types";

export
const DamageType = {
	PHYSICAL: 'physical',
	PROJECTILE: 'projectile',
	ENVIRONMENTAL: 'environmental',
} as const;

export
type DamageType = Enum<typeof DamageType>;

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
interface EntityDamaged {
	targetId: number;
	sourceId?: number;
	amount: number;
	type: DamageType;
}

export
interface EntityDefeated {
	entityId: number;
	entityType: EntityClassification;
}

export
interface Hitbox {
	width: number;
	height: number;
	offsetX?: number;
	offsetY?: number;
	isTrigger?: boolean; // If true, detects but doesn't block
}
	
export
interface Collision {
	collidingWith: number[]; // IDs of entities currently colliding with
	wasColliding: number[]; // IDs of entities colliding in previous frame
}


export
interface EntityCollision {
	entityA: number;
	entityB: number;
	entityAType: EntityClassification;
	entityBType: EntityClassification;
	isNew: boolean; // Whether this is a new collision or ongoing
}

export
interface Hitbox {
	width: number;
	height: number;
	offsetX?: number;
	offsetY?: number;
	isTrigger?: boolean; // If true, detects but doesn't block
}
	
export
interface Collision {
	collidingWith: number[]; // IDs of entities currently colliding with
	wasColliding: number[]; // IDs of entities colliding in previous frame
}


export
interface EntityCollision {
	entityA: number;
	entityB: number;
	entityAType: EntityClassification;
	entityBType: EntityClassification;
	isNew: boolean; // Whether this is a new collision or ongoing
}
