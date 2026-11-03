import { type DomEvent, window } from '@ghia/solid';
import { type Accessor, createSignal, onCleanup } from 'solid-js';
import type { BoxElement } from '../utils/element';
import type {
	HandleClose,
	HoverEvent,
	HoverHandler,
	Side,
} from './use-hover-shared';

export interface HoverHandleCloseOptions {
	/** `safePolygon()`: decides from each pointer move whether the pointer is still on its way to the popup. */
	handleClose: HandleClose;
	/** The trigger. */
	domReference: Accessor<BoxElement | undefined>;
	floating: Accessor<BoxElement | undefined>;
	/** The side of the trigger the popup actually sits on. */
	side: Accessor<Side>;
	hasOpenChild?: () => boolean;
	/** The pointer is not coming: close the popup (upstream's `closeWithDelay`, whose delay is 0 for both users). */
	onClose: () => void;
}

function toHoverEvent(event: DomEvent, type: HoverEvent['type']): HoverEvent {
	if (event.clientX === undefined || event.clientY === undefined) {
		throw new Error(`${type} without coordinates`);
	}
	return {
		type,
		clientX: event.clientX,
		clientY: event.clientY,
		target: event.target,
		relatedTarget: event.relatedTarget,
	};
}

/**
 * The part of `useHoverReferenceInteraction` and `useHoverFloatingInteraction`
 * that runs a `handleClose` (`floating-ui-react/hooks/useHoverReferenceInteraction.ts`
 * `onMouseLeave`, `useHoverFloatingInteraction.ts` `onFloatingMouseEnter` and
 * `onFloatingMouseLeave`). The trigger's `mouseleave` starts it; from then on
 * the handler hears every window `mousemove`, which `@ghia/native` delivers over bare
 * background too, until it closes the popup or `reset` is called.
 */
export function createHoverHandleClose(options: HoverHandleCloseOptions) {
	let handler: HoverHandler | undefined;
	const [blocked, setBlocked] = createSignal(false);

	const onMove = (event: DomEvent) => {
		if (handler === undefined) return;
		handler(toHoverEvent(event, 'mousemove'));
	};

	const stop = () => {
		if (handler === undefined) return;
		window.removeEventListener('mousemove', onMove);
		handler.dispose?.();
		handler = undefined;
	};

	const unblock = () => setBlocked(false);

	const reset = () => {
		stop();
		unblock();
	};
	onCleanup(reset);

	return {
		/** The parent list ignores the pointer: `blockPointerEvents` upstream mutates `pointer-events` on the parent popup. */
		blocked,
		/** The popup opened by hover: with `blockPointerEvents`, the pointer is blocked until it reaches the popup. */
		block() {
			if (options.handleClose.__options?.blockPointerEvents === true) {
				setBlocked(true);
			}
		},
		/**
		 * The pointer left the trigger. Returns `false` when there is nothing to
		 * traverse (the trigger or popup is not mounted), and the caller closes.
		 */
		start(event: DomEvent) {
			const domReference = options.domReference();
			const floating = options.floating();
			if (domReference === undefined || floating === undefined) return false;
			const leave = toHoverEvent(event, 'mouseleave');
			stop();
			handler = options.handleClose({
				x: leave.clientX,
				y: leave.clientY,
				side: options.side(),
				elements: { domReference, floating },
				hasOpenChild: options.hasOpenChild,
				onClose() {
					unblock();
					stop();
					options.onClose();
				},
			});
			window.addEventListener('mousemove', onMove);
			handler(leave);
			return true;
		},
		/**
		 * The pointer reached the popup. A popup that stops its `mousemove` from
		 * bubbling hides the pointer from the window, so the entry itself tells the
		 * handler the pointer has landed (and cancels its stop timer), as the
		 * first `mousemove` over the popup does upstream.
		 */
		enterFloating(event: DomEvent) {
			unblock();
			const floating = options.floating();
			if (handler === undefined || floating === undefined) return;
			const enter = toHoverEvent(event, 'mousemove');
			handler({ ...enter, target: floating });
		},
		/** The pointer left the popup. Returns whether a tracking was running to take it. */
		leaveFloating(event: DomEvent) {
			if (handler === undefined) return false;
			handler(toHoverEvent(event, 'mouseleave'));
			return true;
		},
		active: () => handler !== undefined,
		/** The popup closed or the trigger went away. */
		reset,
	};
}

export type HoverHandleClose = ReturnType<typeof createHoverHandleClose>;
