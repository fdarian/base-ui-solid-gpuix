import { describe, expect, test } from 'bun:test';
import { edgeIndex, isChord, moveIndex } from './composite';

const disabled =
	(...indexes: number[]) =>
	(index: number) =>
		indexes.includes(index);

describe('moveIndex', () => {
	test('steps to the next and previous row', () => {
		expect(moveIndex(1, 1, 4)).toBe(2);
		expect(moveIndex(2, -1, 4)).toBe(1);
	});

	test('from no row, enters at the first row going down and the last going up', () => {
		expect(moveIndex(null, 1, 4)).toBe(0);
		expect(moveIndex(null, -1, 4)).toBe(3);
	});

	test('wraps at an end, or stays put with wrap off', () => {
		expect(moveIndex(3, 1, 4)).toBe(0);
		expect(moveIndex(0, -1, 4)).toBe(3);
		expect(moveIndex(3, 1, 4, undefined, false)).toBe(3);
		expect(moveIndex(0, -1, 4, undefined, false)).toBe(0);
	});

	test('skips disabled rows', () => {
		expect(moveIndex(0, 1, 4, disabled(1, 2))).toBe(3);
		expect(moveIndex(3, 1, 4, disabled(0))).toBe(1);
	});

	test('returns null when no row can be entered', () => {
		expect(moveIndex(null, 1, 0)).toBeNull();
		expect(moveIndex(null, 1, 3, disabled(0, 1, 2))).toBeNull();
	});
});

describe('edgeIndex', () => {
	test('finds the first and last enabled row', () => {
		expect(edgeIndex('first', 4)).toBe(0);
		expect(edgeIndex('last', 4)).toBe(3);
		expect(edgeIndex('first', 4, disabled(0, 1))).toBe(2);
		expect(edgeIndex('last', 4, disabled(3))).toBe(2);
	});

	test('is null for an empty list', () => {
		expect(edgeIndex('first', 0)).toBeNull();
	});
});

describe('isChord', () => {
	test('is true while ctrl, alt or cmd is held', () => {
		expect(isChord({ ctrlKey: true })).toBe(true);
		expect(isChord({ altKey: true })).toBe(true);
		expect(isChord({ metaKey: true })).toBe(true);
	});

	test('is false for a plain or shifted key', () => {
		expect(isChord({})).toBe(false);
		expect(isChord({ ctrlKey: false, altKey: false, metaKey: false })).toBe(
			false,
		);
	});
});
