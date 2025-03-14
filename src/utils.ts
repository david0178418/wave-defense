export function randomInt(min: number, max?: number) {
	if (max === undefined) {
		max = min;
		min = 0;
	}

	return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randomFloat(min: number, max?: number) {
	if (max === undefined) {
		max = min;
		min = 0;
	}

	return Math.random() * (max - min) + min;
}