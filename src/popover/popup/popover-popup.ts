import type { AnchoredPlacementEvent } from '@gpuix/solid';
import { createPlacementState, POPUP_MARGIN } from '../../internals';
import type { PopoverRoot } from '../root/popover-root';

type Side = AnchoredPlacementEvent['side'];
type Align = AnchoredPlacementEvent['align'];

export interface PopoverPopupOptions {
	side: Side;
	align: Align;
	/** Distance from the trigger (`PopoverPositioner`'s `sideOffset`). */
	sideOffset: number;
}

/**
 * The popup's identity and where it goes (`popover/popup/PopoverPopup.tsx`,
 * `popover/positioner/PopoverPositioner.tsx`). Spread `props` on the popup
 * element and `positioner` on the `<anchored>` that holds it; `placement`
 * reports the side it ended up on.
 */
export function createPopoverPopup(
	root: PopoverRoot,
	options: PopoverPopupOptions,
) {
	const placement = createPlacementState(options.side);
	return {
		placement,
		props: {
			id: root.popupId,
			role: 'dialog',
		} as const,
		positioner: {
			side: options.side,
			align: options.align,
			gap: options.sideOffset,
			fit: 'flip',
			snapMargin: POPUP_MARGIN,
			onPlacement: placement.onPlacement,
		} as const,
	};
}
