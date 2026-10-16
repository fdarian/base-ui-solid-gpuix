import type { KeyEvent } from '@gpuix/solid';
import { createUniqueId } from 'solid-js';
import { createPresence } from '../../internals';

export interface PopoverRootProps {
	defaultOpen?: boolean;
	onOpenChange?: (open: boolean) => void;
}

export interface PopoverRootConfig {
	/** How long the popup stays mounted after it closes, for its exit. */
	exitMs: number;
}

/**
 * Open state, unmount timing and dismissal for a popover
 * (`popover/root/PopoverRoot.tsx`, `useDismiss` with outside press and
 * Escape). Pass the component's `props`.
 */
export function createPopoverRoot(
	props: PopoverRootProps,
	config: PopoverRootConfig,
) {
	const presence = createPresence(config.exitMs);

	const setOpen = (next: boolean) => {
		if (next === presence.open()) return;
		if (next) presence.show();
		else presence.hide();
		props.onOpenChange?.(next);
	};
	if (props.defaultOpen === true) {
		// Opens like the initial state would: no `onOpenChange`.
		queueMicrotask(() => {
			if (!presence.open()) presence.show();
		});
	}

	return {
		presence,
		open: presence.open,
		setOpen,
		triggerId: createUniqueId(),
		popupId: createUniqueId(),
		/** Put these on the element that wraps the trigger and the popup: a press outside it closes the popover, and so does Escape from anywhere inside. */
		dismissProps: {
			onMouseDownOutside() {
				setOpen(false);
			},
			onKeyDown(event: KeyEvent) {
				if (event.key === 'Escape') setOpen(false);
			},
		},
	};
}

export type PopoverRoot = ReturnType<typeof createPopoverRoot>;
