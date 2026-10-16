/**
 * No upstream file: Base UI's `getSliderValue` and `valueToPercent`, for a
 * track whose thumb stays inside it (Base UI's inset alignment), with the
 * `steps` list that FF's slider adds (Base UI runs on indices instead).
 */

/** The thumb's offset from the track's left edge for a value: travel is the track width minus the thumb. */
export function valueToPixel(
	value: number,
	min: number,
	max: number,
	trackWidth: number,
	thumbSize: number,
) {
	if (max === min) return 0;
	return ((value - min) / (max - min)) * (trackWidth - thumbSize);
}

/** Strict `<`: a value halfway between two entries snaps to the lower. */
export function nearestStepIndex(value: number, steps: readonly number[]) {
	let index = 0;
	for (let i = 1; i < steps.length; i++) {
		const candidate = steps[i];
		const best = steps[index];
		if (candidate === undefined || best === undefined) {
			throw new Error('Step list index out of range');
		}
		if (Math.abs(candidate - value) < Math.abs(best - value)) index = i;
	}
	return index;
}

function stepAt(steps: readonly number[], index: number) {
	const step = steps[index];
	if (step === undefined) throw new Error(`No step at ${index}`);
	return step;
}

/** The nearest `steps` entry, or the step grid clamped to min / max. Press, drag and release all go pixel -> snapped value -> pixel through here. */
export function pixelToValue(
	px: number,
	min: number,
	max: number,
	step: number,
	trackWidth: number,
	thumbSize: number,
	stepValues: readonly number[] | null,
) {
	const usable = trackWidth - thumbSize;
	if (usable <= 0) return min;
	const raw = (px / usable) * (max - min) + min;
	if (stepValues !== null) {
		return stepAt(stepValues, nearestStepIndex(raw, stepValues));
	}
	const snapped = Math.round((raw - min) / step) * step + min;
	return Math.max(min, Math.min(max, snapped));
}

export function snapToStep(
	value: number,
	min: number,
	max: number,
	step: number,
	stepValues: readonly number[] | null,
) {
	const clamped = Math.max(min, Math.min(max, value));
	if (stepValues !== null) {
		return stepAt(stepValues, nearestStepIndex(clamped, stepValues));
	}
	return Math.round((clamped - min) / step) * step + min;
}
