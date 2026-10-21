import { describe, expect, test } from 'bun:test';
import type { DomEvent, HostElement } from '@gpuix/solid';
import { createRoot } from 'solid-js';
import { createScrollAreaRoot } from './use-scroll-area-root';

/** A scroller as gpuix reports it: integer sizes, and a `scrollTop` clamped to the real range, which is `realMax` and can sit below `scrollHeight - clientHeight`. */
function scroller(realMax: number, scrollHeight: number, clientHeight: number) {
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
			top = Math.min(options.top, realMax);
		},
	} as unknown as HostElement;
	return { element, scrolls };
}

function mount(realMax: number, scrollHeight: number, clientHeight: number) {
	const fake = scroller(realMax, scrollHeight, clientHeight);
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
		const { root } = mount(418, 582, 163);
		expect(root.scrollAlong('y', 100)).toBe(true);
		expect(root.positionOf('y')).toBe(100);
	});

	test('reports false when asked past the real end that the rounded range overshoots by one', () => {
		const { root, scrolls } = mount(418, 582, 163);
		root.scrollAlong('y', 418);
		expect(root.positionOf('y')).toBe(418);
		expect(root.scrollAlong('y', 419 + 40)).toBe(false);
		expect(scrolls.at(-1)).toBe(419);
		expect(root.positionOf('y')).toBe(418);
	});

	test('reports false at the start', () => {
		const { root, scrolls } = mount(418, 582, 163);
		expect(root.scrollAlong('y', -5)).toBe(false);
		expect(scrolls).toEqual([]);
	});

	test('reports false with nothing to scroll', () => {
		const { root } = mount(0, 100, 163);
		expect(root.scrollAlong('y', 10)).toBe(false);
	});
});
