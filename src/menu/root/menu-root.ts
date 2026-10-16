import { document, type HostElement, type KeyEvent } from '@gpuix/solid';
import {
	createEffect,
	createSignal,
	createUniqueId,
	onMount,
	untrack,
} from 'solid-js';
import { refocusAfterPress } from '../../floating-ui-solid/hooks';
import { createPresence } from '../../internals';
import { isChord } from '../../internals/composite';

/** Base UI keeps a press-drag-release from opening a menu from picking a row for this long. */
const PRESS_PICK_MS = 200;

export interface MenuRootProps {
	open?: boolean;
	defaultOpen?: boolean;
	onOpenChange?: (open: boolean) => void;
	disabled?: boolean;
}

export interface MenuRootConfig {
	/** How long the popup stays mounted after `open` goes false, for its exit. */
	exitMs: number;
}

/**
 * Open state, trigger bookkeeping and focus return for a menu
 * (`menu/root/MenuRoot.tsx`). Pass the component's `props` so controlled
 * values stay reactive.
 */
export function createMenuRoot(props: MenuRootProps, config: MenuRootConfig) {
	const presence = createPresence(config.exitMs);
	const [keyboardActive, setKeyboardActive] = createSignal(false);

	const [openFrom, setOpenFrom] = createSignal<'first' | 'last'>('first');
	let pressedAt: number | null = null;
	let pendingTrigger: HostElement | null = null;
	let triggerElement: HostElement | null = null;
	let popupHasFocus: () => boolean = () => false;

	/** Closing hands focus back to the trigger when it sat in the popup, which is about to unmount and drop it, or nowhere; a control that took it since keeps it (Base UI's returnFocus). */
	const returnFocus = () => {
		const target = triggerElement;
		triggerElement = null;
		if (target === null || !target.mounted) return;
		if (popupHasFocus() || document.activeElement === null) target.focus();
	};

	const apply = (next: boolean) => {
		if (next === presence.open()) return;
		if (next) {
			triggerElement = pendingTrigger ?? document.activeElement;
			pendingTrigger = null;
			presence.show();
		} else {
			pressedAt = null;
			presence.hide();
			returnFocus();
		}
	};
	const setOpen = (next: boolean) => {
		if (props.disabled === true && next) return;
		if (props.open === undefined) apply(next);
		props.onOpenChange?.(next);
	};
	createEffect(() => {
		const controlled = props.open;
		if (controlled !== undefined) untrack(() => apply(controlled));
	});
	onMount(() => {
		// Opens like the initial state would: no `onOpenChange`.
		if (props.defaultOpen === true) setTimeout(() => apply(true), 64);
	});

	return {
		presence,
		setOpen,
		keyboardActive,
		setKeyboardActive,
		triggerId: createUniqueId(),
		popupId: createUniqueId(),
		openFrom,
		startPress() {
			setOpenFrom('first');
			pressedAt = performance.now();
		},
		/** A row released under a press that began on the trigger at least 200 ms ago picks (once). */
		pressPick() {
			const at = pressedAt;
			pressedAt = null;
			return at !== null && performance.now() - at >= PRESS_PICK_MS;
		},
		releasePress() {
			pressedAt = null;
		},
		/** Remember the trigger element the menu opened from, to hand focus back to it. */
		noteTrigger(element: HostElement) {
			pendingTrigger = element;
		},
		/** The root popup says how to tell whether focus sits inside it, so a close knows whether the trigger should get focus back. */
		watchPopupFocus(containsFocus: () => boolean) {
			popupHasFocus = containsFocus;
		},
		/** Tab closes the menu. */
		leave() {
			setOpen(false);
		},
		/** Only the closed trigger's keys live here: once open, the popup's list takes them. Put it on the element that wraps the trigger. */
		onKeyDown(event: KeyEvent) {
			if (props.disabled === true) return;
			if (isChord(event)) return;
			if (presence.open()) return;
			if (
				event.key === 'ArrowDown' ||
				event.key === 'ArrowUp' ||
				event.key === 'Enter' ||
				event.key === ' '
			) {
				event.preventDefault();
				if (event.key === 'ArrowDown' || event.key === 'ArrowUp')
					event.stopPropagation();
				setOpenFrom(event.key === 'ArrowUp' ? 'last' : 'first');
				setKeyboardActive(true);
				setOpen(true);
			}
		},
		/** A press outside the wrapper that holds the trigger and the popup. */
		onMouseDownOutside() {
			if (!presence.open()) return;
			const trigger = triggerElement;
			setOpen(false);
			refocusAfterPress(trigger);
		},
	};
}

export type MenuRoot = ReturnType<typeof createMenuRoot>;
