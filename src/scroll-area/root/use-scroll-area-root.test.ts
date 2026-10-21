import { describe, expect, test } from 'bun:test';
import type { DomEvent, HostElement } from '@gpuix/solid';
import { createRoot } from 'solid-js';
import { createScrollAreaRoot } from './use-scroll-area-root';

/** A scroller as gpuix reports it: integer sizes, and a `scrollTop` that `scrollTo` clamps to `[0, scrollHeight - clientHeight]`, like Chrome. */
function scroller(scrollHeight: number, clientHeight: number) {
	let top = 0;
	const scrolls: number[] = [];
	const element = {
		scrollHeight,
		clientHeight,
		scrollWidth: 100,
		clientWidth: 100,
		scrollLeft: 0,
		get scrollTop() {
			return top;
		},
		scrollTo: (options: { top: number }) => {
			scrolls.push(options.top);
			top = Math.max(0, Math.min(options.top, scrollHeight - clientHeight));
		},
	} as unknown as HostElement;
	return { element, scrolls };
}

function mount(scrollHeight: number, clientHeight: number) {
	const fake = scroller(scrollHeight, clientHeight);
	const root = createRoot(() =>
		createScrollAreaRoot({
			orientation: () => 'vertical',
			trackSize: 10,
			thumbInset: 4,
		}),
	);
	root.viewportProps.ref(fake.element);
	const layout = (w: number, h: number) =>
		({ width: w, height: h }) as DomEvent;
	root.viewportProps.onLayout(layout(100, clientHeight));
	root.contentProps.onLayout(layout(100, scrollHeight));
	return { root, scrolls: fake.scrolls };
}

describe('scrollAlong', () => {
	test('moves and reports true inside the range', () => {
		const { root } = mount(582, 163);
		expect(root.scrollAlong('y', 100)).toBe(true);
		expect(root.positionOf('y')).toBe(100);
	});

	test('scrolling to the end reports true and lands on scrollHeight - clientHeight', () => {
		const { root, scrolls } = mount(582, 163);
		expect(root.scrollAlong('y', 419)).toBe(true);
		expect(scrolls).toEqual([419]);
		expect(root.positionOf('y')).toBe(419);
	});

	test('reports false and writes nothing when asked past the end while already there', () => {
		const { root, scrolls } = mount(582, 163);
		root.scrollAlong('y', 419);
		expect(root.scrollAlong('y', 419 + 40)).toBe(false);
		expect(scrolls).toEqual([419]);
		expect(root.positionOf('y')).toBe(419);
	});

	test('reports false at the start', () => {
		const { root, scrolls } = mount(582, 163);
		expect(root.scrollAlong('y', -5)).toBe(false);
		expect(scrolls).toEqual([]);
	});

	test('reports false with nothing to scroll', () => {
		const { root } = mount(100, 163);
		expect(root.scrollAlong('y', 10)).toBe(false);
	});
});
