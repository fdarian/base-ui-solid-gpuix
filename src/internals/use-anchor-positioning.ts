import type { AnchoredPlacementEvent } from '@ghia/solid';
import { createSignal } from 'solid-js';

/** The gap a popup keeps from the window edge: Base UI's default collision padding. */
export const POPUP_MARGIN = 5;

type Side = AnchoredPlacementEvent['side'];

/**
 * What `<anchored fit="flip">` reports about where it ended up: the side it
 * opened on, which may differ from the preferred one, and the height left on
 * that side.
 */
export function createPlacementState(preferred: Side) {
	const [side, setSide] = createSignal<Side>(preferred);
	const [availableHeight, setAvailableHeight] = createSignal(
		Number.POSITIVE_INFINITY,
	);
	return {
		side,
		/** `cap`, or the room on the popup's side if that is smaller. */
		maxHeight: (cap: number) => Math.min(cap, availableHeight()),
		onPlacement(event: AnchoredPlacementEvent) {
			setSide(event.side);
			setAvailableHeight(event.availableHeight);
		},
	};
}
