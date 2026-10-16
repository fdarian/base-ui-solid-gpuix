import { describe, expect, test } from 'bun:test';
import { createTypeahead, matchTypeahead } from './use-typeahead';

const labels = ['Apple', 'Avocado', 'Banana', 'Blueberry', 'Cherry'];

describe('matchTypeahead', () => {
	test('finds the first label at or after the start that begins with the query', () => {
		expect(matchTypeahead(labels, 'b', 0)).toBe(2);
		expect(matchTypeahead(labels, 'bl', 2)).toBe(3);
		expect(matchTypeahead(labels, 'B', 3)).toBe(3);
	});

	test('wraps past the end', () => {
		expect(matchTypeahead(labels, 'a', 3)).toBe(0);
	});

	test('skips disabled rows and rows without a label', () => {
		expect(matchTypeahead(labels, 'a', 0, (index) => index === 0)).toBe(1);
		expect(matchTypeahead(['x', null, undefined, 'y'], 'y', 0)).toBe(3);
	});

	test('is -1 with no match or no rows', () => {
		expect(matchTypeahead(labels, 'z', 0)).toBe(-1);
		expect(matchTypeahead([], 'a', 0)).toBe(-1);
	});
});

describe('createTypeahead', () => {
	function setup(current: number | null = null) {
		const matches: number[] = [];
		const typeahead = createTypeahead({
			labels: () => labels,
			current: () => current,
			onMatch: (index) => matches.push(index),
		});
		return { typeahead, matches };
	}

	test('a typed character matches from the row after the current one', () => {
		const { typeahead, matches } = setup(0);
		expect(typeahead.handleKey({ key: 'a' })).toBe(true);
		expect(matches).toEqual([1]);
		typeahead.reset();
	});

	test('further characters narrow the match within the session', () => {
		const { typeahead, matches } = setup();
		typeahead.handleKey({ key: 'b' });
		typeahead.handleKey({ key: 'l' });
		expect(matches).toEqual([2, 3]);
		expect(typeahead.typing()).toBe(true);
		typeahead.reset();
		expect(typeahead.typing()).toBe(false);
	});

	test('a Space outside a session and chords are not typeahead', () => {
		const { typeahead, matches } = setup();
		expect(typeahead.handleKey({ key: ' ' })).toBe(false);
		expect(typeahead.handleKey({ key: 'a', metaKey: true })).toBe(false);
		expect(typeahead.handleKey({ key: 'Enter' })).toBe(false);
		expect(matches).toEqual([]);
	});

	test('the same letter pressed again cycles through the matches', () => {
		const { typeahead, matches } = setup();
		typeahead.handleKey({ key: 'a' });
		typeahead.handleKey({ key: 'a' });
		expect(matches).toEqual([0, 1]);
		typeahead.reset();
	});
});
