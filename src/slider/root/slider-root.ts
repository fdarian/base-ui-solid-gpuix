import { createMemo } from 'solid-js';

export type SliderRootValue = number | readonly [number, number];

export interface SliderRootOptions {
	value: () => SliderRootValue;
	/** Called with the whole value (a number, or the pair) when one thumb moves. */
	onValueChange: (value: number | [number, number]) => void;
	min: () => number | undefined;
	max: () => number | undefined;
	step: () => number | undefined;
	/** A list of allowed values: the thumbs snap to its entries, and keys walk it by index. */
	steps?: () => readonly number[] | undefined;
	disabled: () => boolean | undefined;
	/** Shift + arrow and Page Up / Down move this many value units (or list entries). Base UI's default. */
	largeStep?: number;
}

/**
 * The slider's value and range. `min`, `max` and `step` default to 0, 100 and
 * 1, and a `steps` list overrides `min` and `max` with its ends.
 */
export function createSliderRoot(options: SliderRootOptions) {
	const values = createMemo((): readonly number[] => {
		const value = options.value();
		return typeof value === 'number' ? [value] : value;
	});
	const isRange = () => typeof options.value() !== 'number';

	// A single entry cannot span a track, so a list of one falls back to min / max / step.
	const stepValues = createMemo(() => {
		const list = options.steps?.();
		if (list === undefined) return null;
		const sorted = [...new Set(list)].sort((a, b) => a - b);
		return sorted.length > 1 ? sorted : null;
	});
	const min = () => stepValues()?.[0] ?? options.min() ?? 0;
	const max = () => {
		const list = stepValues();
		if (list === null) return options.max() ?? 100;
		const last = list[list.length - 1];
		if (last === undefined) throw new Error('Empty step list');
		return last;
	};
	const step = () => options.step() ?? 1;

	const valueAt = (thumb: number) => {
		const value = values()[thumb];
		if (value === undefined) throw new Error(`No thumb ${thumb}`);
		return value;
	};

	/** Moves one thumb; a value the thumb already has is not reported. */
	const setThumbValue = (thumb: number, next: number) => {
		if (next === valueAt(thumb)) return;
		const value = options.value();
		if (typeof value === 'number') {
			options.onValueChange(next);
			return;
		}
		const updated: [number, number] = [value[0], value[1]];
		updated[thumb] = next;
		options.onValueChange(updated);
	};

	return {
		values,
		valueAt,
		isRange,
		min,
		max,
		step,
		stepValues,
		largeStep: options.largeStep ?? 10,
		disabled: () => options.disabled() === true,
		setThumbValue,
	};
}

export type SliderRoot = ReturnType<typeof createSliderRoot>;
