import type { BoxElement } from '../utils/element';

export type Side = 'top' | 'right' | 'bottom' | 'left';

/** What a close handler hears: a window `mousemove`, or the `mouseleave` that starts the tracking. */
export interface HoverEvent {
	type: 'mousemove' | 'mouseleave';
	clientX: number;
	clientY: number;
	/** The element under the pointer; the one being left for a `mouseleave`. `null` outside the window's root box. */
	target: object | null;
	relatedTarget: object | null;
}

export interface HandleCloseOptions {
	/** The parent menu ignores the pointer from the open until the pointer reaches the popup (`pointer-events: none` upstream). */
	blockPointerEvents?: boolean;
}

export interface HandleCloseContext {
	/** Where the pointer left the reference. */
	x: number;
	y: number;
	/** The side of the reference the popup actually sits on. */
	side: Side;
	elements: { domReference: BoxElement; floating: BoxElement };
	onClose: () => void;
	/** A nested popup of the floating element is open: the polygon leaves it alone. Upstream asks the floating tree. */
	hasOpenChild?: () => boolean;
}

export interface HoverHandler {
	(event: HoverEvent): void;
	/** Cancels the timer a stopped handler would otherwise fire; upstream lets it run. */
	dispose?: () => void;
}

export interface HandleClose {
	(context: HandleCloseContext): HoverHandler;
	__options?: HandleCloseOptions;
}
