import { ARROW_PX, PAGE_SHARE } from '../constants';
import type { ScrollAreaAxis } from './get-thumb';

/**
 * What a browser does for a focused scroller: arrows by 40px, pages by 87.5% of
 * the view, Home and End to the ends. `undefined` for any other key.
 */
export function getKeyScroll(
	event: { key?: string; shiftKey?: boolean },
	position: (axis: ScrollAreaAxis) => number,
	viewHeight: number,
): { axis: ScrollAreaAxis; target: number } | undefined {
	switch (event.key) {
		case 'ArrowDown':
		case 'ArrowUp':
			return {
				axis: 'y',
				target:
					position('y') + (event.key === 'ArrowDown' ? ARROW_PX : -ARROW_PX),
			};
		case 'ArrowRight':
		case 'ArrowLeft':
			return {
				axis: 'x',
				target:
					position('x') + (event.key === 'ArrowRight' ? ARROW_PX : -ARROW_PX),
			};
		case 'PageDown':
		case 'PageUp':
		case ' ': {
			const back =
				event.key === 'PageUp' ||
				(event.key === ' ' && event.shiftKey === true);
			return {
				axis: 'y',
				target: position('y') + (back ? -1 : 1) * viewHeight * PAGE_SHARE,
			};
		}
		case 'Home':
			return { axis: 'y', target: 0 };
		case 'End':
			return { axis: 'y', target: Number.POSITIVE_INFINITY };
		default:
			return undefined;
	}
}
