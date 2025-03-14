
export type Enum<T extends object> = T[keyof T];

// TODO: Maybe resources and events are fine centralized? Maybe only components
// have the orgnaizational issues...?

declare global {
	 interface Resources {}

	interface Events {}

	interface Components {}
}

export
interface ActiveControlMap {
	up: boolean;
	down: boolean;
	left: boolean;
	right: boolean;
}
