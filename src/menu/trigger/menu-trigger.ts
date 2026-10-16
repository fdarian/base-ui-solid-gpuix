import type {
	HostElement,
	HostMouseEvent,
	HostPointerEvent,
} from '@gpuix/solid';
import { createPressToggle } from '../../floating-ui-solid/hooks';
import type { MenuRoot } from '../root/menu-root';

export interface MenuTriggerState {
	/** Opens on press, like Base UI: put this on the element that opens the menu. */
	onMouseDown: (event: HostMouseEvent) => void;
	/** The release of that press, or a screen reader's press. Keyboard-originated clicks are ignored: the menu answers those itself. */
	onClick: (event: HostPointerEvent) => void;
	readonly expanded: boolean;
	/** Put these on the element that opens the menu, with the handlers above. */
	readonly attributes: {
		readonly id: string;
		readonly 'aria-expanded': boolean;
		readonly 'aria-haspopup': 'menu';
		/** Base UI names the popup only while it is open. */
		readonly 'aria-controls': string | undefined;
	};
}

/** Press handlers and ARIA for the element that opens the menu (`menu/trigger/MenuTrigger.tsx`). */
export function createMenuTrigger(root: MenuRoot): MenuTriggerState {
	const press = createPressToggle({
		isOpen: root.presence.open,
		open(event, pressed) {
			if (pressed) {
				root.noteTrigger(event.currentTarget as HostElement);
				root.startPress();
			}
			root.setOpen(true);
		},
		close: () => root.setOpen(false),
		onPointer: () => root.setKeyboardActive(false),
		onClickEnd: root.releasePress,
	});
	return {
		onMouseDown: press.onMouseDown,
		onClick: press.onClick,
		get expanded() {
			return root.presence.open();
		},
		attributes: {
			id: root.triggerId,
			get 'aria-expanded'() {
				return root.presence.open();
			},
			'aria-haspopup': 'menu',
			get 'aria-controls'() {
				return root.presence.open() ? root.popupId : undefined;
			},
		},
	};
}
