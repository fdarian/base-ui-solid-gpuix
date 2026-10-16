import type { SliderRoot } from '../root/slider-root';
import { snapToStep } from '../utils/value-pixel';

export interface SliderValueOptions {
	/** Formats a value for display and for `aria-valuetext`; plain `String` without it. */
	format: () => ((value: number) => string) | undefined;
}

/** The value as text, and a typed number snapped onto the slider's grid or list. */
export function createSliderValue(
	root: SliderRoot,
	options: SliderValueOptions,
) {
	return {
		formatValue(value: number) {
			const format = options.format();
			return format === undefined ? String(value) : format(value);
		},
		snapValue(value: number) {
			return snapToStep(
				value,
				root.min(),
				root.max(),
				root.step(),
				root.stepValues(),
			);
		},
	};
}

export type SliderValueState = ReturnType<typeof createSliderValue>;
