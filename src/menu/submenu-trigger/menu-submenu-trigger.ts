import { type Accessor, createEffect, onCleanup, untrack } from 'solid-js';
import type { MenuSubmenuHost } from '../list/menu-list';
import type { MenuSubmenuRoot } from '../submenu-root/menu-submenu-root';

export interface MenuSubmenuTriggerOptions {
	sub: MenuSubmenuRoot;
	/** The parent list's open-submenu bookkeeping. */
	host: MenuSubmenuHost;
	/** What the parent list reports about its highlight. */
	parent: {
		highlightedIndex: Accessor<number | null>;
		pointerLit: Accessor<boolean>;
	};
	props: { index: number; disabled?: boolean };
	setKeyboardActive: (active: boolean) => void;
	/** How long the pointer rests on a lit trigger before its submenu opens. */
	hoverOpenMs: number;
}

/**
 * Opening a submenu from its trigger row: a click or Enter shows it, ArrowRight
 * goes in, hovering opens it after a beat and moving the highlight away closes
 * it (`menu/submenu-trigger/MenuSubmenuTrigger.tsx`).
 */
export function createMenuSubmenuTrigger(options: MenuSubmenuTriggerOptions) {
	const sub = options.sub;
	const props = options.props;
	let hoverTimer: ReturnType<typeof setTimeout> | undefined;
	onCleanup(() => clearTimeout(hoverTimer));

	const show = () => {
		if (props.disabled === true) return;
		sub.setOpen(true);
	};

	// The parent keeps its highlight on the trigger while the submenu is open.
	createEffect(() => {
		if (!sub.open()) return;
		options.host.setOpenIndex(props.index);
		onCleanup(() => {
			if (options.host.openIndex() === props.index) {
				options.host.setOpenIndex(null);
			}
		});
	});
	// Hovering the trigger opens its submenu after a beat; moving the highlight away closes it.
	createEffect(() => {
		const lit = options.parent.highlightedIndex() === props.index;
		clearTimeout(hoverTimer);
		if (!lit) {
			if (untrack(sub.open)) sub.setOpen(false);
			return;
		}
		if (untrack(sub.open) || !options.parent.pointerLit()) return;
		hoverTimer = setTimeout(show, options.hoverOpenMs);
	});

	return {
		/** A click opens immediately, hover mode or not. */
		onSelect: show,
		onOpenSubmenu() {
			options.setKeyboardActive(true);
			show();
			sub.enter();
		},
	};
}
