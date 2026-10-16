import { describe, expect, test } from 'bun:test';
import { getDecimalPrecision, roundValueToStep } from './round-value-to-step';

describe('getDecimalPrecision', () => {
	test('counts the digits after the point', () => {
		expect(getDecimalPrecision(0)).toBe(0);
		expect(getDecimalPrecision(5)).toBe(0);
		expect(getDecimalPrecision(0.25)).toBe(2);
		expect(getDecimalPrecision(12.5)).toBe(1);
	});

	test('reads very small numbers through their exponent', () => {
		expect(getDecimalPrecision(0.00000001)).toBe(8);
		expect(getDecimalPrecision(1.5e-7)).toBe(8);
	});
});

describe('roundValueToStep', () => {
	test('lands on the nearest step from min', () => {
		expect(roundValueToStep(7, 5, 0)).toBe(5);
		expect(roundValueToStep(8, 5, 0)).toBe(10);
		expect(roundValueToStep(3, 5, 1)).toBe(1);
	});

	test('does not leave float noise on decimal steps', () => {
		expect(roundValueToStep(0.3, 0.1, 0)).toBe(0.3);
		expect(roundValueToStep(0.1 + 0.2, 0.1, 0)).toBe(0.3);
	});
});
