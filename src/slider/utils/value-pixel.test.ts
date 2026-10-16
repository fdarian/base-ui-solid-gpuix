import { describe, expect, test } from 'bun:test';
import {
	nearestStepIndex,
	pixelToValue,
	snapToStep,
	valueToPixel,
} from './value-pixel';

describe('valueToPixel', () => {
	test('travel is the track width minus the thumb', () => {
		expect(valueToPixel(0, 0, 100, 220, 20)).toBe(0);
		expect(valueToPixel(50, 0, 100, 220, 20)).toBe(100);
		expect(valueToPixel(100, 0, 100, 220, 20)).toBe(200);
	});

	test('a degenerate range sits at the start', () => {
		expect(valueToPixel(5, 5, 5, 220, 20)).toBe(0);
	});
});

describe('nearestStepIndex', () => {
	test('a value halfway between two entries snaps to the lower', () => {
		expect(nearestStepIndex(15, [10, 20, 40])).toBe(0);
		expect(nearestStepIndex(31, [10, 20, 40])).toBe(2);
	});
});

describe('pixelToValue', () => {
	test('snaps to the step grid and clamps to the bounds', () => {
		expect(pixelToValue(101, 0, 100, 10, 220, 20, null)).toBe(50);
		expect(pixelToValue(-40, 0, 100, 10, 220, 20, null)).toBe(0);
		expect(pixelToValue(400, 0, 100, 10, 220, 20, null)).toBe(100);
	});

	test('picks the nearest entry of a step list', () => {
		expect(pixelToValue(60, 0, 40, 1, 220, 20, [0, 10, 40])).toBe(10);
	});

	test('a track no wider than the thumb is min', () => {
		expect(pixelToValue(5, 3, 9, 1, 20, 20, null)).toBe(3);
	});
});

describe('snapToStep', () => {
	test('clamps, then rounds onto the grid or the list', () => {
		expect(snapToStep(130, 0, 100, 10, null)).toBe(100);
		expect(snapToStep(34, 0, 100, 10, null)).toBe(30);
		expect(snapToStep(34, 0, 40, 1, [0, 10, 40])).toBe(40);
	});
});
