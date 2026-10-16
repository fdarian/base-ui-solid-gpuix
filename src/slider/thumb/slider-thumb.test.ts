import { describe, expect, test } from 'bun:test';
import type { KeyEvent } from '@gpuix/solid';
import { createRoot } from 'solid-js';
import { createSliderRoot } from '../root/slider-root';
import { createSliderThumb, keyboardStep } from './slider-thumb';

function key(name: string, shift = false) {
	let prevented = false;
	let stopped = false;
	const event = {
		key: name,
		shiftKey: shift,
		defaultPrevented: false,
		preventDefault: () => {
			prevented = true;
		},
		stopPropagation: () => {
			stopped = true;
		},
	} as unknown as KeyEvent;
	return {
		event,
		prevented: () => prevented,
		stopped: () => stopped,
	};
}

/** A slider at `value`, a thumb on it, and what each key makes of the value. */
function setup(
	value: number | [number, number],
	extra: { step?: number; steps?: number[]; disabled?: boolean } = {},
) {
	const changes: (number | [number, number])[] = [];
	return createRoot(() => {
		const root = createSliderRoot({
			value: () => value,
			onValueChange: (next) => {
				changes.push(next);
			},
			min: () => undefined,
			max: () => undefined,
			step: () => extra.step,
			steps: () => extra.steps,
			disabled: () => extra.disabled,
		});
		const thumb = (index: number) =>
			createSliderThumb(root, {
				index,
				label: () => undefined,
				formatValue: (v) => `${v}!`,
			});
		const thumbs = [thumb(0), thumb(1)] as const;
		return { root, thumbs, changes };
	});
}

describe('keyboardStep', () => {
	test('rounds the start onto the grid before moving', () => {
		expect(keyboardStep(0.2, 0.1, 1, 0, 1, 0.1)).toBe(0.3);
		expect(keyboardStep(52, 25, 1, 0, 100, 25)).toBe(75);
	});

	test('clamps to the bounds', () => {
		expect(keyboardStep(95, 10, 1, 0, 100, 1)).toBe(100);
		expect(keyboardStep(3, 10, -1, 0, 100, 1)).toBe(0);
	});
});

describe('thumb keys', () => {
	test('arrows move by step, Shift by the large step', () => {
		const { thumbs, changes } = setup(50, { step: 5 });
		thumbs[0].thumbProps.onKeyDown(key('ArrowRight').event);
		thumbs[0].thumbProps.onKeyDown(key('ArrowLeft').event);
		thumbs[0].thumbProps.onKeyDown(key('ArrowUp', true).event);
		expect(changes).toEqual([55, 45, 60]);
	});

	test('Page Up and Down bubble, arrows do not', () => {
		const { thumbs } = setup(50);
		const page = key('PageUp');
		const arrow = key('ArrowUp');
		thumbs[0].thumbProps.onKeyDown(page.event);
		thumbs[0].thumbProps.onKeyDown(arrow.event);
		expect(page.prevented()).toBe(true);
		expect(page.stopped()).toBe(false);
		expect(arrow.stopped()).toBe(true);
	});

	test('Home and End go to the bound, or to the neighbouring thumb in a range', () => {
		const { thumbs, changes } = setup([20, 60]);
		thumbs[0].thumbProps.onKeyDown(key('End').event);
		thumbs[1].thumbProps.onKeyDown(key('Home').event);
		thumbs[0].thumbProps.onKeyDown(key('Home').event);
		thumbs[1].thumbProps.onKeyDown(key('End').event);
		expect(changes).toEqual([
			[60, 60],
			[20, 20],
			[0, 60],
			[20, 100],
		]);
	});

	test('a value the key leaves unchanged is not reported', () => {
		const { thumbs, changes } = setup(100);
		thumbs[0].thumbProps.onKeyDown(key('ArrowRight').event);
		expect(changes).toEqual([]);
	});

	test('a steps list is walked by index', () => {
		const { thumbs, changes } = setup(10, { steps: [0, 10, 40, 100] });
		thumbs[0].thumbProps.onKeyDown(key('ArrowRight').event);
		thumbs[0].thumbProps.onKeyDown(key('PageUp').event);
		expect(changes).toEqual([40, 100]);
	});

	test('a disabled slider ignores keys', () => {
		const { thumbs, changes } = setup(50, { disabled: true });
		const event = key('ArrowRight');
		thumbs[0].thumbProps.onKeyDown(event.event);
		expect(changes).toEqual([]);
		expect(event.prevented()).toBe(false);
	});
});

describe('thumb ARIA', () => {
	test('a lone thumb reports the number and leaves the text out', () => {
		const { thumbs } = setup(30);
		const props = thumbs[0].thumbProps;
		expect(props['aria-valuenow']).toBe(30);
		expect(props['aria-valuemin']).toBe(0);
		expect(props['aria-valuemax']).toBe(100);
		expect(props['aria-valuetext']).toBeUndefined();
	});

	test('a range says which end each thumb is', () => {
		const { thumbs } = setup([20, 60]);
		expect(thumbs[0].thumbProps['aria-valuetext']).toBe('20 start range');
		expect(thumbs[1].thumbProps['aria-valuetext']).toBe('60 end range');
	});

	test('a steps list reports indices and announces the entry', () => {
		const { thumbs } = setup(40, { steps: [0, 10, 40, 100] });
		const props = thumbs[0].thumbProps;
		expect(props['aria-valuenow']).toBe(2);
		expect(props['aria-valuemax']).toBe(3);
		expect(props['aria-valuetext']).toBe('40!');
	});

	test('a disabled thumb leaves the tab order', () => {
		expect(setup(1, { disabled: true }).thumbs[0].thumbProps.tabIndex).toBe(-1);
		expect(setup(1).thumbs[0].thumbProps.tabIndex).toBe(0);
	});
});
