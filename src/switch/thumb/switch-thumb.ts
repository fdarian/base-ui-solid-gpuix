import type { HostMouseEvent, HostMouseMoveEvent } from '@gpuix/solid';
import { createSignal } from 'solid-js';
import { createPointerCapture } from '../../utils/pointer-capture';

export interface SwitchThumbOptions {
	checked: () => boolean;
	disabled: () => boolean | undefined;
	onCheckedChange: (checked: boolean) => void;
	/** Where the thumb rests now, in the drag axis' pixels: a drag moves 1:1 from here. */
	restX: () => number;
	dragMin: () => number;
	dragMax: () => number;
	/** Pointer travel before a press turns into a drag; under it the gesture stays a click. */
	deadZone: number;
}

/**
 * The press and drag on a switch's row. Base UI's switch has neither: it
 * toggles through its root only. Here a press anywhere on the row toggles, and a
 * drag past the dead zone moves the thumb with the pointer and lets go on
 * whichever side of the midpoint it ended. The toggle runs on release for both
 * gestures, so no second click follows a drag.
 */
export function createSwitchThumb(options: SwitchThumbOptions) {
	const [pressed, setPressed] = createSignal(false);
	const [dragX, setDragX] = createSignal<number | null>(null);
	let press: { startX: number; originX: number } | undefined;
	let dragging = false;
	const row = createPointerCapture('Switch');

	const onPressStart = (event: HostMouseEvent) => {
		if (options.disabled() === true || event.button !== 0) return;
		if (event.x === undefined) throw new Error('mouseDown without coordinates');
		row.capture(event);
		setPressed(true);
		dragging = false;
		press = { startX: event.x, originX: options.restX() };
	};

	const onPressMove = (event: HostMouseMoveEvent) => {
		if (press === undefined) return;
		if (event.x === undefined) throw new Error('mouseMove without coordinates');
		const delta = event.x - press.startX;
		if (!dragging) {
			if (Math.abs(delta) < options.deadZone) return;
			dragging = true;
		}
		setDragX(
			Math.max(
				options.dragMin(),
				Math.min(options.dragMax(), press.originX + delta),
			),
		);
	};

	const onRelease = () => {
		if (press === undefined) return;
		const wasDragging = dragging;
		const releasedAt = dragX();
		press = undefined;
		dragging = false;
		setPressed(false);
		setDragX(null);
		if (!wasDragging) {
			options.onCheckedChange(!options.checked());
			return;
		}
		if (releasedAt === null) throw new Error('drag ended without a position');
		// Past the midpoint of the drag range is on, short of it off, whichever side it started from.
		const shouldBeOn = releasedAt > (options.dragMin() + options.dragMax()) / 2;
		if (shouldBeOn !== options.checked()) {
			options.onCheckedChange(shouldBeOn);
		}
	};

	// The release ends the capture, so it arrives as pointerup, then lostpointercapture, then mouseup: only a capture lost with the press still down is a cancel.
	const onPressCancel = () => {
		if (press === undefined) return;
		press = undefined;
		dragging = false;
		setPressed(false);
		setDragX(null);
	};

	return {
		pressed,
		/** The dragged thumb's x while a drag is under way, else `null`. */
		dragX,
		ref: row.ref,
		pressProps: {
			onMouseDown: onPressStart,
			onMouseMove: onPressMove,
			onPointerUp: onRelease,
			onLostPointerCapture: onPressCancel,
		},
	};
}

export type SwitchThumb = ReturnType<typeof createSwitchThumb>;
