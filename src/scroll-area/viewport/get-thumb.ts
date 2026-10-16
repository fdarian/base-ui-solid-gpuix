import { MIN_THUMB_SIZE } from '../constants';

export interface ScrollAreaSize {
	w: number;
	h: number;
}

export type ScrollAreaAxis = 'x' | 'y';

export interface ScrollAreaThumb {
	length: number;
	start: number;
	/** How far the thumb can travel: the track less the thumb and its margins. */
	travel: number;
	maxScroll: number;
}

/** Overflow = the content is longer than the view, with half a pixel of tolerance. */
export function overflows(
	view: ScrollAreaSize | undefined,
	content: ScrollAreaSize | undefined,
	axis: ScrollAreaAxis,
) {
	if (view === undefined || content === undefined) return false;
	return axis === 'y' ? content.h > view.h + 0.5 : content.w > view.w + 0.5;
}

/**
 * The thumb's span along its track, or `null` when there is nothing to scroll.
 * `corner` is the end of the track the other axis's scrollbar takes; the
 * thumb keeps `thumbInset` off each end of its track.
 */
export function getThumb(options: {
	view: ScrollAreaSize | undefined;
	content: ScrollAreaSize | undefined;
	offset: { x: number; y: number };
	axis: ScrollAreaAxis;
	corner: number;
	thumbInset: number;
}): ScrollAreaThumb | null {
	const size = options.view;
	const inner = options.content;
	if (
		size === undefined ||
		inner === undefined ||
		!overflows(size, inner, options.axis)
	) {
		return null;
	}
	const axis = options.axis;
	const viewLength = axis === 'y' ? size.h : size.w;
	const total = axis === 'y' ? inner.h : inner.w;
	const scrolled = axis === 'y' ? options.offset.y : options.offset.x;
	const track = viewLength - options.corner;
	const length = Math.max(
		MIN_THUMB_SIZE,
		Math.min(track, viewLength - options.thumbInset * 2) * (viewLength / total),
	);
	const travel = track - length - options.thumbInset * 2;
	const maxScroll = total - viewLength;
	return {
		length,
		start:
			options.thumbInset + (travel > 0 ? (scrolled / maxScroll) * travel : 0),
		travel,
		maxScroll,
	};
}
