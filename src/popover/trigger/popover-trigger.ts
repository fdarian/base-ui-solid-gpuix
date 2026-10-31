import type { KeyEvent } from '@ghia/solid';
import type { PopoverRoot } from '../root/popover-root';

/**
 * Click toggle and ARIA for the element that opens the popover
 * (`popover/trigger/PopoverTrigger.tsx`, `useClick`). Unlike a menu, a popover
 * toggles on the click, not the press. Enter and Space stand in for the click
 * a native button would raise.
 */
export function createPopoverTrigger(root: PopoverRoot) {
	const toggle = () => root.setOpen(!root.open());
	return {
		onClick: toggle,
		onKeyDown(event: KeyEvent) {
			if (event.key !== 'Enter' && event.key !== ' ') return;
			event.preventDefault();
			toggle();
		},
		attributes: {
			'aria-haspopup': 'dialog',
			get 'aria-expanded'() {
				return root.open();
			},
			get 'aria-controls'() {
				return root.open() ? root.popupId : undefined;
			},
		} as const,
	};
}
