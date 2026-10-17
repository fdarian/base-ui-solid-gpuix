import type { HostElement, HostMouseEvent, HostWheelEvent } from '@gpuix/solid';
import type { ScrollAreaRootState } from '../root/use-scroll-area-root';
import { clamp, pointerAlong } from '../utils/scroll-math';
import type { ScrollAreaAxis } from '../viewport/get-thumb';

/**
 * One axis's scrollbar over `createScrollAreaRoot`: the thumb's span, a press
 * on the track or thumb, a drag and a wheel over the track. Spread `trackProps`
 * on the track; the thumb sits inside it.
 */
export function createScrollAreaScrollbar(
	root: ScrollAreaRootState,
	axis: ScrollAreaAxis,
	options: { thumbInset: number },
) {
	let track: HostElement | undefined;
	const span = () => root.thumb(axis);
	/** The pointer is over this track, or its thumb is being dragged. */
	const hovered = () =>
		root.trackHovered() === axis || root.dragging() === axis;

	/** A press on the thumb starts a drag; one on the bare track jumps the way Base UI does and goes on as a drag from there. */
	const pressTrack = (event: HostMouseEvent) => {
		// Native scrollbars never move focus, whichever button presses them; gpuix blurs the focused element on a press with no focusable element in its path unless this is called.
		event.preventDefault();
		// Only the primary button presses a scrollbar.
		if (event.button !== undefined && event.button !== 0) return;
		const thumb = span();
		if (thumb === null || track === undefined) return;
		const box = track.getBoundingClientRect();
		root.markUserScroll();
		const along = pointerAlong(axis, event) - (axis === 'y' ? box.y : box.x);
		if (along >= thumb.start && along <= thumb.start + thumb.length) {
			root.startDrag(axis, track, event, root.positionOf(axis));
			return;
		}
		if (thumb.travel <= 0) return;
		// Base UI's `clickPosition`: the thumb's centre under the pointer, offset by half the thumb margins.
		const clickPosition = along - thumb.length / 2 + options.thumbInset;
		const target = clamp(
			(clickPosition / thumb.travel) * thumb.maxScroll,
			0,
			thumb.maxScroll,
		);
		root.scrollAlong(axis, target);
		root.startDrag(axis, track, event, target);
	};

	/** A wheel event over the track scrolls the viewport, which is not under the pointer, and is prevented so the scroller around the area does not take it too. A viewport already at its limit leaves the event alone: gpuix gives one event to the innermost scroller that can use it, which is then the scroller around the area. */
	const wheelTrack = (event: HostWheelEvent) => {
		const delta = axis === 'y' ? event.deltaY : event.deltaX;
		if (delta === 0) return;
		root.markUserScroll();
		if (root.scrollAlong(axis, root.positionOf(axis) + delta))
			event.preventDefault();
	};

	return {
		span,
		hovered,
		dragging: () => root.dragging() === axis,
		scrolling: () => root.scrolling()[axis],
		trackProps: {
			ref(element: HostElement) {
				track = element;
			},
			onMouseEnter: () => root.setTrackHovered(axis),
			onMouseLeave: () => root.setTrackHovered(undefined),
			onMouseDown: pressTrack,
			onMouseMove: root.dragTo,
			onMouseUp: root.stopDrag,
			onLostPointerCapture: root.stopDrag,
			onWheel: wheelTrack,
		},
	};
}
