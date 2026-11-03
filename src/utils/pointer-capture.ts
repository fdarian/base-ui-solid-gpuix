import type { HostElement, HostMouseEvent } from '@ghia/solid';

/**
 * A drag has to keep its moves and its release after the pointer leaves the
 * element, and `@ghia/native` only captures when asked: put `ref` on the element that
 * owns the drag's move and release handlers and call `capture` from the press.
 * The release ends the capture; end the drag on `onLostPointerCapture` as well,
 * so no drag flag stays set.
 */
export function createPointerCapture(owner: string) {
	let element: HostElement | undefined;
	return {
		ref(host: HostElement) {
			element = host;
		},
		capture(event: HostMouseEvent) {
			if (element === undefined) {
				throw new Error(
					`${owner}: pressed before the capturing element mounted`,
				);
			}
			element.setPointerCapture(event.pointerId);
		},
	};
}
