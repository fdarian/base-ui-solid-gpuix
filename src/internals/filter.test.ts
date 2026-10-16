import { expect, test } from 'bun:test';
import { contains } from './filter';

test('an empty query matches everything', () => {
	expect(contains('Apple', '')).toBe(true);
});

test('matches a substring ignoring case', () => {
	expect(contains('Pineapple', 'APPLE')).toBe(true);
	expect(contains('Pineapple', 'plum')).toBe(false);
});

test('ignores accents', () => {
	expect(contains('Crème brûlée', 'creme')).toBe(true);
});

test('a query longer than the text never matches', () => {
	expect(contains('fig', 'figs')).toBe(false);
});
