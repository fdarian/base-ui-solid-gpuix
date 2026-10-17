import type {
	DomEvent,
	HostElement,
	HostMouseEvent,
	KeyEvent,
	ScrollEvent,
} from '@gpuix/solid';
import { createSignal, onCleanup } from 'solid-js';
import { isChord } from '../../internals/composite';
import { SCROLL_TIMEOUT, USER_SCROLL_MS } from '../constants';
import { clamp, pointerAlong } from '../utils/scroll-math';
import { getKeyScroll } from '../viewport/get-key-scroll';
import {
	getThumb,
	overflows as overflowsAlong,
	type ScrollAreaAxis,
	type ScrollAreaSize,
} from '../viewport/get-thumb';

export type ScrollAreaOrientation = 'vertical' | 'horizontal' | 'both';

export interface UseScrollAreaRootOptions {
	orientation: () => ScrollAreaOrientation;
	/** The scrollbar track's thickness: the corner square between two bars is this big. */
	trackSize: number;
	/** The thumb keeps this far off each end of its track. */
	thumbInset: number;
	/** After the offset changes, for what depends on where the content sits under the pointer. */
	onScroll?: () => void;
}

function sizeOf(event: Pick<DomEvent, 'width' | 'height'>): ScrollAreaSize {
	if (event.width === undefined || event.height === undefined) {
		throw new Error('layout event without a size');
	}
	return { w: event.width, h: event.height };
}

/**
 * State, measurement, thumb maths, drag, track press, wheel and keys for a
 * scroll area over a gpuix scroller. Spread `rootProps` on the root,
 * `viewportProps` on the scroller and `contentProps` on its one child; a bar
 * is built from this with `createScrollAreaScrollbar`.
 */
export function createScrollAreaRoot(options: UseScrollAreaRootOptions) {
	const orientation = options.orientation;
	const vertical = () => orientation() !== 'horizontal';
	const horizontal = () => orientation() !== 'vertical';
	const both = () => orientation() === 'both';

	let viewport: HostElement | undefined;
	const scrollingTimer: Record<
		ScrollAreaAxis,
		ReturnType<typeof setTimeout> | undefined
	> = { x: undefined, y: undefined };
	let userTimer: ReturnType<typeof setTimeout> | undefined;
	let userScroll = false;
	onCleanup(() => {
		clearTimeout(scrollingTimer.x);
		clearTimeout(scrollingTimer.y);
		clearTimeout(userTimer);
	});

	// Sizes come from `onLayout` (border box, reported after the first paint and on every resize) and the offset from `onScroll`, so nothing here is polled.
	const [view, setView] = createSignal<ScrollAreaSize>();
	const [content, setContent] = createSignal<ScrollAreaSize>();
	/** Scrolled distance, positive. */
	const [offset, setOffset] = createSignal({ x: 0, y: 0 });
	const [rootHovered, setRootHovered] = createSignal(false);
	const [trackHovered, setTrackHovered] = createSignal<ScrollAreaAxis>();
	const [scrolling, setScrolling] = createSignal({ x: false, y: false });
	const [dragging, setDragging] = createSignal<ScrollAreaAxis>();

	/** Base UI counts a scroll as the user's only after a wheel tick, key or press on the area. */
	const markUserScroll = () => {
		userScroll = true;
		clearTimeout(userTimer);
		userTimer = setTimeout(() => {
			userScroll = false;
		}, USER_SCROLL_MS);
	};
	const startScrolling = (axis: ScrollAreaAxis) => {
		setScrolling((now) => ({ ...now, [axis]: true }));
		clearTimeout(scrollingTimer[axis]);
		scrollingTimer[axis] = setTimeout(
			() => setScrolling((now) => ({ ...now, [axis]: false })),
			SCROLL_TIMEOUT,
		);
	};
	const stopScrolling = (axis: ScrollAreaAxis) => {
		clearTimeout(scrollingTimer[axis]);
		setScrolling((now) => ({ ...now, [axis]: false }));
	};

	const onScroll = (event: ScrollEvent) => {
		const next = { x: event.scrollLeft, y: event.scrollTop };
		const before = offset();
		if (userScroll || dragging() !== undefined) {
			if (next.y !== before.y) startScrolling('y');
			if (next.x !== before.x) startScrolling('x');
		}
		setOffset(next);
		options.onScroll?.();
	};

	const mountedViewport = () => {
		if (viewport === undefined) throw new Error('ScrollArea is not mounted');
		return viewport;
	};
	/** Read from the element, so it is current inside an input handler before `onScroll` has reported. */
	const positionOf = (axis: ScrollAreaAxis) =>
		axis === 'x' ? mountedViewport().scrollLeft : mountedViewport().scrollTop;

	// ── Thumb geometry ──────────────────────────────────────────────────────

	const overflows = (axis: ScrollAreaAxis) =>
		overflowsAlong(view(), content(), axis);
	/** The corner square exists only while both scrollbars do, and takes the end of both tracks. */
	const corner = () =>
		both() && overflows('x') && overflows('y') ? options.trackSize : 0;

	/** The thumb's span along its track, or `null` when there is nothing to scroll. */
	const thumb = (axis: ScrollAreaAxis) =>
		getThumb({
			view: view(),
			content: content(),
			offset: offset(),
			axis,
			corner: corner(),
			thumbInset: options.thumbInset,
		});

	/** Scrolls the viewport along `axis`; false when there is nothing to scroll or it is already there. */
	const scrollAlong = (axis: ScrollAreaAxis, distance: number) => {
		const span = thumb(axis);
		if (span === null) return false;
		const next = clamp(distance, 0, span.maxScroll);
		if (next === positionOf(axis)) return false;
		mountedViewport().scrollTo(axis === 'x' ? { left: next } : { top: next });
		return true;
	};

	// ── Dragging ────────────────────────────────────────────────────────────

	let dragOrigin = { pointer: 0, scrolled: 0 };
	const startDrag = (
		axis: ScrollAreaAxis,
		track: HostElement,
		event: HostMouseEvent,
		scrolled: number,
	) => {
		// The thumb keeps following the pointer once it leaves the narrow track.
		track.setPointerCapture(event.pointerId);
		dragOrigin = { pointer: pointerAlong(axis, event), scrolled };
		setDragging(axis);
	};
	const stopDrag = () => {
		const axis = dragging();
		if (axis === undefined) return;
		setDragging(undefined);
		stopScrolling(axis);
	};
	const dragTo = (event: HostMouseEvent) => {
		// Capture ends the drag on release and on lost capture; this stays for a release the window never saw (outside it, or while it was inactive), which may not be delivered even to a capturing element.
		if (event.pressedButton === undefined) {
			stopDrag();
			return;
		}
		const axis = dragging();
		const span = axis === undefined ? null : thumb(axis);
		if (axis === undefined || span === null || span.travel <= 0) return;
		scrollAlong(
			axis,
			dragOrigin.scrolled +
				((pointerAlong(axis, event) - dragOrigin.pointer) / span.travel) *
					span.maxScroll,
		);
	};

	// ── Keyboard ────────────────────────────────────────────────────────────

	const onKeyDown = (event: KeyEvent) => {
		if (isChord(event)) return;
		// Keys from a focused descendant (an input, a listbox) are that descendant's.
		if (event.defaultPrevented || event.target !== mountedViewport()) {
			return;
		}
		const size = view();
		if (size === undefined) return;
		const scroll = getKeyScroll(event, positionOf, size.h);
		if (scroll === undefined || thumb(scroll.axis) === null) {
			return;
		}
		event.preventDefault();
		markUserScroll();
		scrollAlong(scroll.axis, scroll.target);
	};

	return {
		orientation,
		vertical,
		horizontal,
		view,
		content,
		offset,
		/** The pointer is anywhere in the root. */
		hovering: rootHovered,
		/** Per axis: the offset changed by a user action within the last 500 ms, or a drag. */
		scrolling,
		/** The axis whose thumb is being dragged. */
		dragging,
		/** The axis whose track the pointer is over. */
		trackHovered,
		setTrackHovered,
		overflows,
		corner,
		thumb,
		positionOf,
		scrollAlong,
		markUserScroll,
		startDrag,
		stopDrag,
		dragTo,
		rootProps: {
			onMouseEnter: () => setRootHovered(true),
			onMouseLeave: () => setRootHovered(false),
		},
		viewportProps: {
			ref(element: HostElement) {
				viewport = element;
			},
			onScroll,
			onWheel: markUserScroll,
			onLayout: (event: DomEvent) => setView(sizeOf(event)),
			// A viewport that overflows is a tab stop and scrolls with the keys, like a focused scroller in a browser.
			get tabIndex() {
				return overflows('x') || overflows('y') ? 0 : -1;
			},
			onKeyDown,
		},
		contentProps: {
			onLayout: (event: DomEvent) => setContent(sizeOf(event)),
		},
	};
}

export type ScrollAreaRootState = ReturnType<typeof createScrollAreaRoot>;
