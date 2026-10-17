import { document, type HostElement, type HostMouseEvent } from '@gpuix/solid';

/**
 * After an outside press has closed a popup, the trigger takes focus back, as in
 * Base UI (`FloatingFocusManager` `returnFocus`, pinned by "returns focus to
 * reference on outside press" in its test). There the return runs after the
 * popup's exit, behind the press's own focus default. Here the close hands
 * focus to the trigger at once, and a press over bare background then blurs it:
 * gpuix, like a browser, runs that default after the `mousedown` handlers. So
 * the trigger takes focus again on the next tick; a control that took focus
 * from the press keeps it.
 */
export function refocusAfterPress(trigger: HostElement | null | undefined) {
	if (trigger === null || trigger === undefined) return;
	setTimeout(() => {
		if (trigger.mounted && document.activeElement === null) trigger.focus();
	}, 0);
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
			// Cancels the focus move the press would make, which would pull focus back from the popup the toggle just focused. Windows and Linux run this handler after native moved focus, where it changes nothing.
			event.preventDefault();
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
