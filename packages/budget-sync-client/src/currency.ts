import { Brand, Schema } from "effect";

export type Dollars = number & Brand.Brand<"Dollars">;
const Dollars = Brand.nominal<Dollars>();
export const DollarsSchema = Schema.fromBrand(Dollars)(Schema.Number);
export const DollarsFromStringSchema = Schema.fromBrand(Dollars)(
	Schema.NumberFromString,
);

export const decodeDollarsSync = Schema.decodeSync(DollarsSchema);

export type Cents = number & Brand.Brand<"Cents">;
const Cents = Brand.nominal<Cents>();
export const CentsSchema = Schema.fromBrand(Cents)(Schema.Number);

export type Milliunits = number & Brand.Brand<"Milliunits">;
const Milliunits = Brand.nominal<Milliunits>();
export const MilliunitsSchema = Schema.fromBrand(Milliunits)(Schema.Number);
export const decodeMilliunitsSync = Schema.decodeSync(MilliunitsSchema);
export const decodeMilliunits = Schema.decode(MilliunitsSchema);

/**
 * Rounds a number to a given number of decimal places, mitigating floating‐point error.
 * @param value    The input number.
 * @param decimals How many decimal places to keep (default 2).
 * @returns The rounded value.
 */
export function round(value: number, decimals = 2): number {
	const factor = 10 ** Math.round(decimals);
	const eps = Number.EPSILON * value * factor;
	return Math.round((value + eps) * factor) / factor;
}

/**
 * Converts an amount in milliunits to dollars.
 * @param milliunits The amount in milliunits (1 000 milliunits = 1 dollar).
 * @returns The amount in dollars, rounded to 2 decimal places.
 */
export function milliunitsToDollars(milliunits: Milliunits): Dollars {
	return Dollars(round(milliunits / 1000));
}

/**
 * Converts an amount in dollars to milliunits.
 * @param dollars The amount in dollars.
 * @returns The amount in milliunits (rounded to nearest integer).
 */
export function dollarsToMilliunits(dollars: Dollars): Milliunits {
	return Milliunits(round(dollars * 1000, 0));
}

/**
 * Converts an amount in cents to milliunits.
 * @param cents The amount in cents (100 cents = 1 dollar).
 * @returns The amount in milliunits (1 cent = 10 milliunits, rounded to nearest integer).
 */
export function centsToMilliunits(cents: Cents): Milliunits {
	return Milliunits(round(cents * 10, 0));
}

/**
 * Converts an amount in milliunits to cents.
 * @param milliunits The amount in milliunits.
 * @returns The amount in cents (rounded to nearest integer).
 */
export function milliunitsToCents(milliunits: Milliunits): Cents {
	return Cents(round(milliunits / 10, 0));
}

/**
 * Converts an amount in dollars to cents.
 * @param dollars The amount in dollars.
 * @returns The amount in cents (rounded to nearest integer).
 */
export function dollarsToCents(dollars: Dollars): Cents {
	return Cents(round(dollars * 100, 0));
}

/**
 * Converts an amount in cents to dollars.
 * @param cents The amount in cents.
 * @returns The amount in dollars, rounded to 2 decimal places.
 */
export function centsToDollars(cents: Cents): Dollars {
	return Dollars(round(cents / 100));
}
