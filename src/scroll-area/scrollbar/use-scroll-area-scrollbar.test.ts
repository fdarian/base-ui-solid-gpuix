import { describe, expect, test } from 'bun:test';
import type { HostMouseEvent } from '@ghia/solid';
import type { ScrollAreaRootState } from '../root/use-scroll-area-root';
import { createScrollAreaScrollbar } from './use-scroll-area-scrollbar';

function press(button: number | undefined, thumb: 'none' | 'track') {
	const calls: string[] = [];
	const root = {
		thumb: () =>
			thumb === 'none'
				? null
				: { start: 0, length: 20, travel: 80, maxScroll: 400 },
		markUserScroll: () => calls.push('markUserScroll'),
		scrollAlong: () => calls.push('scrollAlong'),
		startDrag: () => calls.push('startDrag'),
		positionOf: () => 0,
		trackHovered: () => undefined,
		dragging: () => undefined,
	} as unknown as ScrollAreaRootState;
	const scrollbar = createScrollAreaScrollbar(root, 'y', { thumbInset: 4 });
	scrollbar.trackProps.ref({
		getBoundingClientRect: () => ({ x: 0, y: 0 }),
	} as never);
	let prevented = 0;
	scrollbar.trackProps.onMouseDown({
		button,
		x: 5,
		y: 60,
		preventDefault: () => prevented++,
	} as unknown as HostMouseEvent);
	return { prevented, calls };
}

describe('scrollbar press', () => {
	test('prevents the default so focus stays where it is', () => {
		const result = press(0, 'track');
		expect(result.prevented).toBe(1);
		expect(result.calls).toContain('startDrag');
	});

	test('prevents the default for any button, as native scrollbars do', () => {
		const result = press(2, 'track');
		expect(result.prevented).toBe(1);
		expect(result.calls).toEqual([]);
	});

	test('prevents the default when there is no thumb to press', () => {
		expect(press(0, 'none').prevented).toBe(1);
	});
});
