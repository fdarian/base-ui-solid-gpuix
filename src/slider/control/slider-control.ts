import type {
	HostElement,
	HostMouseEvent,
	HostMouseMoveEvent,
} from '@gpuix/solid';
import { createSignal } from 'solid-js';
import { createPointerCapture } from '../../utils/pointer-capture';
import type { SliderRoot } from '../root/slider-root';
import { pixelToValue, valueToPixel } from '../utils/value-pixel';

function pointerX(event: Pick<HostMouseEvent, 'x'>) {
	if (event.x === undefined)
		throw new Error('Pointer event without coordinates');
	return event.x;
}

export interface ControlBox {
	/** Put on the element whose box maps pointer x to a value. */
	ref: (host: HostElement) => void;
	/** The box at the moment of a press: reads it again and reports it to `onMeasure`. */
	sync: () => void;
	/** The window x of the box's left edge, as of the last `sync`. */
	left: () => number;
	/** The box's width, as of the last `sync`. */
	width: () => number;
}

/** The element's box at the moment of a press. The width the render uses comes from the element's `onLayout`. */
export function createControlBox(options: {
	onMeasure: (box: { x: number; width: number }) => void;
}): ControlBox {
	let element: HostElement | undefined;
	let left = 0;
	let width = 0;
	return {
		ref(host) {
			element = host;
		},
		sync() {
			if (element === undefined || !element.mounted) {
				throw new Error('Slider is not mounted');
			}
			const painted = element.getBoundingClientRect();
			left = painted.x;
			width = painted.width;
			options.onMeasure(painted);
		},
		left: () => left,
		width: () => width,
	};
}

export interface SliderControlOptions {
	/** Names the owner in the error for a press before the capturing element mounted. */
	owner: string;
	box: ControlBox;
	/**
	 * The thumb's layout box. Thumbs stay inside the track, so travel is the
	 * track width minus this (Base UI's inset alignment). Used by the default
	 * `valueAt` and thumb pick.
	 */
	thumbSize?: number;
	/** Window x -> the value the thumb would take, when the control's own mapping does not apply. */
	valueAt?: (x: number, thumb: number) => number;
	/** The pointer moved over the control with no press down. */
	onHover?: (x: number) => void;
	/** A press ended (release or lost capture). */
	onRelease?: () => void;
	/** Keeps the press from reaching an ancestor's press handler, which would end the gesture this one starts. */
	stopPropagation?: boolean;
}

/**
 * Press, drag and release on a slider's track. A press snaps the nearer thumb
 * to the pointer and a drag re-snaps it on every move, outside the element too
 * (the press captures the pointer).
 */
export function createSliderControl(
	root: SliderRoot,
	options: SliderControlOptions,
) {
	const capture = createPointerCapture(options.owner);
	const [pressed, setPressed] = createSignal(false);
	/** True once a press has moved: from then on the thumb is placed, not sprung. */
	const [moving, setMoving] = createSignal(false);
	let dragging = false;
	let activeThumb = 0;

	const thumbSize = () => {
		if (options.thumbSize === undefined) {
			throw new Error(`${options.owner}: no thumbSize for the default mapping`);
		}
		return options.thumbSize;
	};
	/** A thumb's left offset for a value at the box's live width. */
	const thumbLeft = (value: number) =>
		valueToPixel(
			value,
			root.min(),
			root.max(),
			options.box.width(),
			thumbSize(),
		);

	/** Each thumb stops half a thumb short of the other, so the knobs may overlap a little but never swap sides. */
	const clampForRange = (px: number, thumb: number) => {
		if (!root.isRange()) return px;
		const other = thumbLeft(root.valueAt(1 - thumb));
		return thumb === 0
			? Math.min(px, other - thumbSize() * 0.5)
			: Math.max(px, other + thumbSize() * 0.5);
	};

	const pixelValue = (px: number) =>
		pixelToValue(
			px,
			root.min(),
			root.max(),
			root.step(),
			options.box.width(),
			thumbSize(),
			root.stepValues(),
		);

	/** Window x -> the snapped, range-clamped value the thumb would take. */
	const valueAt = (x: number, thumb: number) => {
		if (options.valueAt !== undefined) return options.valueAt(x, thumb);
		const local = x - options.box.left() - thumbSize() / 2;
		const clamped = Math.max(
			0,
			Math.min(options.box.width() - thumbSize(), local),
		);
		const snapped = pixelValue(clamped);
		const px = clampForRange(thumbLeft(snapped), thumb);
		return pixelValue(px);
	};

	/** The nearer thumb takes the press; a tie (stacked thumbs) goes to the first. */
	const pickThumb = (x: number) => {
		if (!root.isRange()) return 0;
		const local = Math.max(
			0,
			Math.min(
				options.box.width() - thumbSize(),
				x - options.box.left() - thumbSize() / 2,
			),
		);
		return Math.abs(local - thumbLeft(root.valueAt(0))) >
			Math.abs(local - thumbLeft(root.valueAt(1)))
			? 1
			: 0;
	};

	const onPress = (event: HostMouseEvent) => {
		if (root.disabled() || event.button !== 0) return;
		if (options.stopPropagation === true) event.stopPropagation();
		capture.capture(event);
		options.box.sync();
		const x = pointerX(event);
		activeThumb = pickThumb(x);
		dragging = true;
		setPressed(true);
		setMoving(false);
		root.setThumbValue(activeThumb, valueAt(x, activeThumb));
	};
	const onMove = (event: HostMouseMoveEvent) => {
		const x = pointerX(event);
		if (!dragging) {
			if (root.disabled()) return;
			options.onHover?.(x);
			return;
		}
		setMoving(true);
		root.setThumbValue(activeThumb, valueAt(x, activeThumb));
	};
	const onRelease = () => {
		if (!dragging) return;
		dragging = false;
		setPressed(false);
		setMoving(false);
		options.onRelease?.();
	};

	return {
		/** Put on the element that owns the drag's move and release handlers. */
		ref: capture.ref,
		pressed,
		moving,
		pressProps: {
			onMouseDown: onPress,
			onMouseMove: onMove,
			onMouseUp: onRelease,
			onLostPointerCapture: onRelease,
		},
	};
}

export type SliderControl = ReturnType<typeof createSliderControl>;
