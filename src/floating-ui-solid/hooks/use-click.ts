import type { HostMouseEvent, useGpuixRequired } from "@gpuix/solid";

/**
 * Base UI's `returnFocus`: a closing popup hands focus back to its trigger,
 * unless focus already moved to another control (an outside press on one keeps
 * that control's focus). `force` is for focus that sat inside the popup itself.
 */
export function returnFocusTo(
	renderer: ReturnType<typeof useGpuixRequired>,
	elementId: number,
	force = false,
) {
	const focused = renderer.getFocusedElementId?.();
	if (force || focused === undefined || focused === null) {
		renderer.focusElement?.(elementId);
	}
}

/**
 * Press-to-toggle for the element that opens a popup, like Base UI: the
 * primary button toggles on mouse-down, and the click that follows that press
 * is ignored. A click with no press before it (a screen reader's) toggles on
 * its own; a click raised by the keyboard is left to the popup's key handler.
 */
export function createPressToggle(options: {
	isOpen: () => boolean;
	/** `pressed` is false for a click that came without a press. */
	open: (event: HostMouseEvent, pressed: boolean) => void;
	close: () => void;
	/** Runs on every pointer interaction, before the toggle. */
	onPointer?: () => void;
	/** Runs on the click that ends a press, whatever happens to the toggle. */
	onClickEnd?: () => void;
}) {
	/** The press already toggled the popup: its click must not toggle it back. */
	let pressHandled = false;
	const toggle = (event: HostMouseEvent, pressed: boolean) => {
		options.onPointer?.();
		if (options.isOpen()) options.close();
		else options.open(event, pressed);
	};
	return {
		onMouseDown(event: HostMouseEvent) {
			if (event.button !== undefined && event.button !== 0) return;
			pressHandled = true;
			toggle(event, true);
		},
		onClick(event: HostMouseEvent) {
			if (event.detail === 0) return;
			options.onClickEnd?.();
			if (pressHandled) {
				pressHandled = false;
				return;
			}
			toggle(event, false);
		},
	};
}
