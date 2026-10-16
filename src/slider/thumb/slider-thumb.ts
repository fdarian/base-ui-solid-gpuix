import type { KeyEvent } from '@gpuix/solid';
import { createUniqueId } from 'solid-js';
import type { SliderRoot } from '../root/slider-root';
import {
	getDecimalPrecision,
	roundValueToStep,
} from '../utils/round-value-to-step';
import { nearestStepIndex } from '../utils/value-pixel';

export interface SliderThumbOptions {
	index: number;
	/** The thumb's accessible name. */
	label: () => string | undefined;
	/** Announces a `steps` list entry through `aria-valuetext`. */
	formatValue: (value: number) => string;
}

/** One keyboard move from `current` by `increment`: the current value is first rounded onto the step grid, the result is rounded to the widest precision involved and clamped (Base UI's `roundValueToStep` + `getNewValue`). */
export function keyboardStep(
	current: number,
	increment: number,
	direction: 1 | -1,
	min: number,
	max: number,
	step: number,
) {
	const onGrid = roundValueToStep(current, step, min);
	const moved = Number(
		(onGrid + increment * direction).toFixed(
			Math.max(
				getDecimalPrecision(onGrid),
				getDecimalPrecision(increment),
				getDecimalPrecision(min),
			),
		),
	);
	return Math.max(min, Math.min(max, moved));
}

/**
 * One thumb's focus, ARIA and keys: arrows by `step` (Shift: `largeStep`),
 * Page Up / Down by `largeStep`, Home / End to the bound or the neighbouring
 * thumb. A `steps` list runs on indices, like Base UI on `0..n-1`.
 */
export function createSliderThumb(
	root: SliderRoot,
	options: SliderThumbOptions,
) {
	const id = createUniqueId();
	const value = () => root.valueAt(options.index);

	const onKeyDown = (event: KeyEvent) => {
		if (root.disabled() || event.defaultPrevented) return;
		const list = root.stepValues();
		const current = value();
		const min = root.min();
		const max = root.max();
		const step = root.step();
		const large = event.shiftKey === true;
		const walk = (direction: 1 | -1, jump: boolean) => {
			if (list === null) {
				return keyboardStep(
					current,
					jump ? root.largeStep : step,
					direction,
					min,
					max,
					step,
				);
			}
			const index =
				nearestStepIndex(current, list) +
				direction * (jump ? root.largeStep : 1);
			const entry = list[Math.max(0, Math.min(list.length - 1, index))];
			if (entry === undefined) throw new Error(`No step at ${index}`);
			return entry;
		};
		const lower = options.index === 1 ? root.valueAt(0) : min;
		const upper = options.index === 0 && root.isRange() ? root.valueAt(1) : max;
		let next: number;
		switch (event.key) {
			case 'ArrowRight':
			case 'ArrowUp':
				next = walk(1, large);
				break;
			case 'ArrowLeft':
			case 'ArrowDown':
				next = walk(-1, large);
				break;
			case 'PageUp':
				next = walk(1, true);
				break;
			case 'PageDown':
				next = walk(-1, true);
				break;
			case 'Home':
				next = lower;
				break;
			case 'End':
				next = upper;
				break;
			default:
				return;
		}
		event.preventDefault();
		// Base UI keeps its composite keys from reaching ancestors; Page Up / Down still bubble.
		if (event.key !== 'PageUp' && event.key !== 'PageDown') {
			event.stopPropagation();
		}
		root.setThumbValue(options.index, Math.max(lower, Math.min(upper, next)));
	};

	/** Base UI's thumb values: a `steps` list runs on indices, so the entry is announced through `aria-valuetext`; a range says which end it is; a lone thumb is left to the number. */
	const aria = () => {
		const current = value();
		const list = root.stepValues();
		if (list !== null) {
			return {
				now: nearestStepIndex(current, list),
				min: 0,
				max: list.length - 1,
				text: options.formatValue(current),
			};
		}
		return {
			now: current,
			min: root.min(),
			max: root.max(),
			text: root.isRange()
				? `${current.toLocaleString()} ${options.index === 0 ? 'start' : 'end'} range`
				: undefined,
		};
	};

	return {
		thumbProps: {
			id,
			role: 'slider' as const,
			get tabIndex() {
				return root.disabled() ? -1 : 0;
			},
			get 'aria-label'() {
				return options.label();
			},
			'aria-orientation': 'horizontal' as const,
			get 'aria-valuenow'() {
				return aria().now;
			},
			get 'aria-valuemin'() {
				return aria().min;
			},
			get 'aria-valuemax'() {
				return aria().max;
			},
			get 'aria-valuetext'() {
				return aria().text;
			},
			get 'aria-disabled'() {
				return root.disabled();
			},
			onKeyDown,
		},
	};
}

export type SliderThumb = ReturnType<typeof createSliderThumb>;
