import type { DomEvent, HostElement, HostMouseEvent } from '@gpuix/solid';
import { type Accessor, onCleanup } from 'solid-js';
import {
	createHoverHandleClose,
	type Side,
} from '../../floating-ui-solid/hooks';
import { safePolygon } from '../../floating-ui-solid/safe-polygon';
import type { TooltipRoot } from '../root/tooltip-root';

export interface TooltipTriggerConfig {
	/** The side of the trigger the popup actually sits on, after any flip. */
	side: Accessor<Side>;
}

/**
 * Hover intent, focus, press and the safe polygon of one tooltip
 * (`tooltip/trigger/TooltipTrigger.tsx`, `useHoverReferenceInteraction`,
 * `useFocus`). Put the handlers on the element that wraps the trigger: its
 * children's hover, press and `focusin` bubble to it. The popup is anchored
 * inside that element, so the wrapper also hears the pointer enter and leave
 * the popup.
 */
export function createTooltipTrigger(
	root: TooltipRoot,
	config: TooltipTriggerConfig,
) {
	const group = root.group;
	let delayTimer: ReturnType<typeof setTimeout> | undefined;
	let triggerElement: HostElement | undefined;
	let popupElement: HostElement | undefined;
	/** A rest timer is running: moves of under ~1.4 px leave it alone, anything bigger restarts it. */
	let restPending = false;
	let lastPointer: { x: number; y: number } | undefined;
	/** Set by a close, cleared by the next enter: the pointer moving inside the trigger after a press must not reopen. */
	let blockMove = false;
	/** A press or Escape closed the tooltip: the trigger still holds focus, which must not reopen it until the pointer leaves or focus moves on. */
	let blockFocus = false;
	/** The pointer opened it, as against focus: only a hover-opened tooltip closes when the pointer leaves its popup (`isHoverOpen` upstream). */
	let hoverOpened = false;
	/** Where the pointer left the popup. The popup sits inside the wrapper, so the same move reports the wrapper's leave next. */
	let popupExit: { x: number; y: number } | undefined;
	onCleanup(() => clearTimeout(delayTimer));

	const close = () => {
		clearTimeout(delayTimer);
		tracking.reset();
		restPending = false;
		blockMove = true;
		hoverOpened = false;
		popupExit = undefined;
		if (!root.opened()) return;
		group.closedAt = performance.now();
		root.setOpen(false);
	};
	const tracking = createHoverHandleClose({
		handleClose: safePolygon(),
		domReference: () => triggerElement,
		floating: () => popupElement,
		side: config.side,
		onClose: close,
	});
	const openByHover = () => {
		hoverOpened = true;
		root.setOpen(true);
	};
	/** A press or Escape: closes, and keyboard focus on the trigger no longer reopens it. */
	const dismiss = () => {
		blockFocus = root.opened();
		close();
	};
	return {
		dismiss,
		/** The trigger's, or the popup's: the popup is inside the wrapper. */
		onMouseEnter() {
			clearTimeout(delayTimer);
			popupExit = undefined;
			restPending = false;
			blockMove = false;
			lastPointer = undefined;
			// Coming back while the popup is still fading out brings it straight back.
			const fadingOut = root.presence.mounted() && !root.presence.open();
			// With a delay, entering starts nothing: the timer runs from the pointer's moves (`onMouseMove`).
			if (fadingOut || root.delay() === 0) openByHover();
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
				if (!blockMove) openByHover();
			}, wait);
		},
		/** The pointer left the trigger: a pending open is dropped, an open tooltip starts tracking the pointer toward its popup. */
		onMouseLeave(event: DomEvent) {
			blockFocus = false;
			clearTimeout(delayTimer);
			restPending = false;
			if (!root.opened()) return;
			if (
				popupExit !== undefined &&
				popupExit.x === event.clientX &&
				popupExit.y === event.clientY
			) {
				popupExit = undefined;
				return;
			}
			if (!tracking.start(event)) close();
		},
		onMouseDown: dismiss,
		// The child takes focus, not the wrapper, and `focus` does not bubble: `focusin` does.
		onFocusIn(event: DomEvent) {
			if (!event.focusVisible || blockFocus) return;
			clearTimeout(delayTimer);
			hoverOpened = false;
			root.setOpen(true);
		},
		onFocusOut() {
			blockFocus = false;
			close();
		},
		/** The element the wrapper's handlers are on: the polygon's reference. */
		setTriggerElement(element: HostElement) {
			triggerElement = element;
		},
		setPopupElement(element: HostElement) {
			popupElement = element;
		},
		/** The pointer reached the popup: the polygon has done its job. */
		enterPopup(event: DomEvent) {
			popupExit = undefined;
			tracking.enterFloating(event);
		},
		/** The popup is hoverable but not sticky: the polygon (or, without one running, a hover-opened tooltip) closes on leaving it. */
		leavePopup(event: DomEvent) {
			if (event.clientX === undefined || event.clientY === undefined) {
				throw new Error('mouseleave without coordinates');
			}
			popupExit = { x: event.clientX, y: event.clientY };
			if (tracking.leaveFloating(event)) return;
			if (hoverOpened) close();
		},
	};
}

export type TooltipTrigger = ReturnType<typeof createTooltipTrigger>;
