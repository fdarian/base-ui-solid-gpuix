import { describe, expect, test } from 'bun:test';
import { getKeyScroll } from './get-key-scroll';
import { getThumb, overflows } from './get-thumb';

const view = { w: 100, h: 200 };
const content = { w: 100, h: 800 };

describe('overflows', () => {
	test('needs a measured view and content, and more than half a pixel past', () => {
		expect(overflows(undefined, content, 'y')).toBe(false);
		expect(overflows(view, { w: 100, h: 200.5 }, 'y')).toBe(false);
		expect(overflows(view, { w: 100, h: 201 }, 'y')).toBe(true);
		expect(overflows(view, content, 'x')).toBe(false);
	});
});

describe('getThumb', () => {
	const thumb = (y: number) =>
		getThumb({
			view,
			content,
			offset: { x: 0, y },
			axis: 'y',
			corner: 0,
			thumbInset: 4,
		});

	test('is null when nothing overflows', () => {
		expect(
			getThumb({
				view,
				content: view,
				offset: { x: 0, y: 0 },
				axis: 'y',
				corner: 0,
				thumbInset: 4,
			}),
		).toBeNull();
	});

	test('sizes the thumb by the view share and moves it with the offset', () => {
		const top = thumb(0);
		const end = thumb(600);
		expect(top?.length).toBeCloseTo(48);
		expect(top?.start).toBe(4);
		expect(top?.maxScroll).toBe(600);
		expect(end?.start).toBeCloseTo(4 + (200 - 48 - 8));
	});

	test('keeps a minimum length', () => {
		const tall = getThumb({
			view,
			content: { w: 100, h: 20000 },
			offset: { x: 0, y: 0 },
			axis: 'y',
			corner: 0,
			thumbInset: 4,
		});
		expect(tall?.length).toBe(16);
	});

	test('a track too short to travel leaves the thumb at the start', () => {
		const short = getThumb({
			view: { w: 100, h: 20 },
			content: { w: 100, h: 800 },
			offset: { x: 0, y: 300 },
			axis: 'y',
			corner: 0,
			thumbInset: 4,
		});
		expect(short?.travel).toBeLessThanOrEqual(0);
		expect(short?.start).toBe(4);
	});
});

describe('getKeyScroll', () => {
	const at = () => 100;
	test('arrows step 40px on their axis', () => {
		expect(getKeyScroll({ key: 'ArrowDown' }, at, 200)).toEqual({
			axis: 'y',
			target: 140,
		});
		expect(getKeyScroll({ key: 'ArrowLeft' }, at, 200)).toEqual({
			axis: 'x',
			target: 60,
		});
	});

	test('pages and space step 87.5% of the view, shift-space goes back', () => {
		expect(getKeyScroll({ key: 'PageDown' }, at, 200)?.target).toBe(275);
		expect(getKeyScroll({ key: ' ', shiftKey: true }, at, 200)?.target).toBe(
			-75,
		);
	});

	test('Home and End go to the ends; other keys are not handled', () => {
		expect(getKeyScroll({ key: 'Home' }, at, 200)?.target).toBe(0);
		expect(getKeyScroll({ key: 'End' }, at, 200)?.target).toBe(
			Number.POSITIVE_INFINITY,
		);
		expect(getKeyScroll({ key: 'a' }, at, 200)).toBeUndefined();
	});
});
