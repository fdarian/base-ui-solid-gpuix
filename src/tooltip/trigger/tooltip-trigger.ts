import type { DomEvent, HostMouseEvent } from '@gpuix/solid';
import { onCleanup } from 'solid-js';
import type { TooltipRoot } from '../root/tooltip-root';

export interface TooltipTriggerConfig {
	/** How long the tooltip stays after the pointer leaves, so it can cross the gap to the popup: Base UI's safe polygon, approximated with a timer. */
	graceMs: number;
}

/**
 * Hover intent, focus, press and the close grace of one tooltip
 * (`tooltip/trigger/TooltipTrigger.tsx`, `useHoverReferenceInteraction`,
 * `useFocus`). Put the handlers on the element that wraps the trigger: its
 * children's hover, press and `focusin` bubble to it.
 */
export function createTooltipTrigger(
	root: TooltipRoot,
	config: TooltipTriggerConfig,
) {
	const group = root.group;
	let delayTimer: ReturnType<typeof setTimeout> | undefined;
	let closeTimer: ReturnType<typeof setTimeout> | undefined;
	/** A rest timer is running: moves of under ~1.4 px leave it alone, anything bigger restarts it. */
	let restPending = false;
	let lastPointer: { x: number; y: number } | undefined;
	/** Set by a close, cleared by the next enter: the pointer moving inside the trigger after a press must not reopen. */
	let blockMove = false;
	/** A press or Escape closed the tooltip: the trigger still holds focus, which must not reopen it until the pointer leaves or focus moves on. */
	let blockFocus = false;
	/** The pointer is on the popup. It enters the popup before the trigger reports it left, so the trigger's leave must not start the close. */
	let overPopup = false;
	onCleanup(() => {
		clearTimeout(delayTimer);
		clearTimeout(closeTimer);
	});

	const close = () => {
		clearTimeout(delayTimer);
		clearTimeout(closeTimer);
		restPending = false;
		blockMove = true;
		overPopup = false;
		if (!root.opened()) return;
		group.closedAt = performance.now();
		root.setOpen(false);
	};
	/** A press or Escape: closes, and keyboard focus on the trigger no longer reopens it. */
	const dismiss = () => {
		blockFocus = root.opened();
		close();
	};
	/** The pointer left the trigger or the popup: a pending open is dropped, an open tooltip closes unless the pointer reaches the popup (or comes back) first. */
	const scheduleClose = () => {
		clearTimeout(delayTimer);
		clearTimeout(closeTimer);
		restPending = false;
		if (!root.opened() || overPopup) return;
		closeTimer = setTimeout(close, config.graceMs);
	};

	return {
		dismiss,
		onMouseEnter() {
			clearTimeout(delayTimer);
			clearTimeout(closeTimer);
			restPending = false;
			blockMove = false;
			lastPointer = undefined;
			// Coming back while the popup is still fading out brings it straight back.
			const fadingOut = root.presence.mounted() && !root.presence.open();
			// With a delay, entering starts nothing: the timer runs from the pointer's moves (`onMouseMove`).
			if (fadingOut || root.delay() === 0) root.setOpen(true);
		},
		/** Base UI's `restMs`: the tooltip opens once the pointer has rested on the trigger for the delay. */
		onMouseMove(event: HostMouseEvent) {
			if (event.x === undefined || event.y === undefined) return;
			const last = lastPointer;
			lastPointer = { x: event.x, y: event.y };
			if (root.opened() || blockMove) return;
			const wait = root.delay();
			if (wait === 0) return;
			if (
				restPending &&
				last !== undefined &&
				(event.x - last.x) ** 2 + (event.y - last.y) ** 2 < 2
			)
				return;
			clearTimeout(delayTimer);
			restPending = true;
			delayTimer = setTimeout(() => {
				restPending = false;
				if (!blockMove) root.setOpen(true);
			}, wait);
		},
		onMouseLeave() {
			blockFocus = false;
			scheduleClose();
		},
		onMouseDown: dismiss,
		// The child takes focus, not the wrapper, and `focus` does not bubble: `focusin` does.
		onFocusIn(event: DomEvent) {
			if (!event.focusVisible || blockFocus) return;
			clearTimeout(delayTimer);
			clearTimeout(closeTimer);
			root.setOpen(true);
		},
		onFocusOut() {
			blockFocus = false;
			close();
		},
		/** The pointer reached the popup: it keeps the tooltip open. */
		enterPopup() {
			overPopup = true;
			clearTimeout(closeTimer);
		},
		leavePopup() {
			overPopup = false;
			scheduleClose();
		},
	};
}

export type TooltipTrigger = ReturnType<typeof createTooltipTrigger>;
