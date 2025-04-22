import type { Vector2D } from "./types";

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

export function range(start: number, end?: number) {
	if (end === undefined) {
		end = start;
		start = 0;
	}

	return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

/**
 * Returns a random element from an array
 * @param array The array to select a random element from
 * @returns A random element from the array
 */
export function getRandomElement<T>(array: T[]): T {
	const el = array[Math.floor(Math.random() * array.length)];

	if (!el) {
		throw new Error("Cannot get random element from empty array");
	}
	return el;
}

export function capitalizeFirstLetter(string: string) {
	return string.charAt(0).toUpperCase() + string.slice(1);
}


// Possibly a really bad port of this: https://stackoverflow.com/questions/22872515/how-do-i-create-a-javascript-elite-planet-name-generator
class SciFiNameGenerator {
	private static readonly digrams = "ABOUSEITILETSTONLONUTHNO" +
			"..LEXEGEZACEBISOUSESARMAINDIREA.ERATENBERALAVETIEDORQUANTEISRION"
	constructor(
		private seeds = [23114, 584, 46931],
	) {}

	generate(): string {
		const pairs = SciFiNameGenerator.digrams.substring(24);

		const name = makeName(pairs, this.seeds);

		this.seeds = tweakSeed(this.nextSeeds(this.seeds));

		return name;
	}

	private nextSeeds(seeds: number[]){
		return seeds.map(twist)
	}
}

function makeName(pairs: string, seeds: number[]): string {
	const name: string[] = [];
	// @ts-ignore
	const longName = (seeds[0] & 64) !== 0;

	const pairIndices = Array(4).fill(0).map(() => {
		seeds = tweakSeed(seeds);
		// @ts-ignore
		return 2 * ((seeds[2] >> 8) & 31);
	});
	
	pairIndices.forEach((value, index, arr) => {
		if (longName || index < arr.length - 1) {
			// @ts-ignore
			name.push(pairs[value], pairs[value + 1]);
		}
	});
	
	return name.join('').toLowerCase().replace(/^\w/, letter => letter.toUpperCase());
};

function tweakSeed(seeds: number[]) {
	const sum = seeds.reduce((total, seed) => total + seed, 0);
	return seeds.map((_, index, arr) => arr[index + 1] ?? (sum & 65535));
}

function twist(x: number) {
	return (256 * rotateLeft(x >> 8)) + rotateLeft(x & 255);
}

function rotateLeft(x: number): number {
	let tmp = (x & 255) * 2;
	return tmp > 255 ? tmp - 255 : tmp;
}

export function pointInRectangle({ x, y }: Vector2D, b: { x: number; y: number; width: number; height: number; }) {
	return x >= b.x && x <= b.x + b.width && y >= b.y && y <= b.y + b.height;
}

export const sciFiNameGenerator = new SciFiNameGenerator();

// Extract what I can from this...
// function generatePlanetName(): string {
// 	// Define arrays for syllable components
// 	const startingConsonants = [
// 		"b", "c", "d", "f", "g", "h", "j", "k", "l", "m", "n", "p", "q", "r", "s", "t", "v", "w", "x", "z",
// 		"bl", "br", "cl", "cr", "dr", "fl", "fr", "gl", "gr", "kl", "kr", "pl", "pr", "qu", "sc", "sk",
// 		"sl", "sm", "sn", "sp", "st", "sw", "tr", "vl", "vr", "zl", "zr"
// 	];
// 	const vowels = [
// 		"a", "e", "i", "o", "u", "y", "ae", "ai", "au", "ea", "ei", "eu", "ia", "ie", "io", "oa", "oi",
// 		"oo", "ou", "ua", "ue", "ui", "uo"
// 	];
// 	const endingConsonants = ["b", "d", "f", "g", "k", "l", "m", "n", "p", "r", "s", "t", "v", "x", "z"];

// 	// Function to generate a single syllable
// 	function generateSyllable(): string {
// 		const start = getRandomElement(startingConsonants);
// 		const vowel = getRandomElement(vowels);

// 		// 70% chance of adding an ending consonant
// 		const end: string = (Math.random() < 0.7) ? getRandomElement(endingConsonants) : "";

// 		return start + vowel + end;
// 	}

// 	// Function to determine the number of syllables (weighted towards 2 or 3)
// 	function getSyllableCount(): number {
// 		const rand: number = Math.random();
// 		if (rand < 0.2) return 1;  // 20% chance of 1 syllable
// 		if (rand < 0.6) return 2;  // 40% chance of 2 syllables
// 		if (rand < 0.9) return 3;  // 30% chance of 3 syllables
// 		return 4;                  // 10% chance of 4 syllables
// 	}

// 	// Generate the base name
// 	const syllableCount  = getSyllableCount();
// 	const name = capitalizeFirstLetter(
// 		range(syllableCount)
// 			.map(generateSyllable)
// 			.join("")
// 	);

// 	const designations = ["Prime", "Major", "Minor", "Alpha", "Beta", "I", "II", "III", "IV", "V"];

// 	const designation = (Math.random() < 0.1) ? `${getRandomElement(designations)} ` : "";

// 	return designation + name;
// }