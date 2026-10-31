import type { DomEvent, HostElement } from '@ghia/solid';
import { type Accessor, createEffect, onCleanup, untrack } from 'solid-js';
import {
	createHoverHandleClose,
	type Side,
} from '../../floating-ui-solid/hooks';
import { safePolygon } from '../../floating-ui-solid/safe-polygon';
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
	/** The row, which the submenu's popup is anchored inside. */
	triggerElement: Accessor<HostElement | undefined>;
	/** The side of the row the popup actually sits on, after any flip. */
	side: Accessor<Side>;
	setKeyboardActive: (active: boolean) => void;
	/** How long the pointer rests on a lit trigger before its submenu opens. */
	hoverOpenMs: number;
}

/**
 * Opening a submenu from its trigger row: a click or Enter shows it, ArrowRight
 * goes in, hovering opens it after a beat, and a pointer that leaves the row
 * for anywhere but the submenu closes it
 * (`menu/submenu-trigger/MenuSubmenuTrigger.tsx`, with
 * `safePolygon({ blockPointerEvents: true })`).
 */
export function createMenuSubmenuTrigger(options: MenuSubmenuTriggerOptions) {
	const sub = options.sub;
	const props = options.props;
	let hoverTimer: ReturnType<typeof setTimeout> | undefined;
	let popupElement: HostElement | undefined;
	/** The pointer opened it: only then does it close with the pointer (`isHoverOpen` upstream). */
	let hoverOpened = false;
	/** Where the pointer left the popup. The popup sits inside the row, so the same move reports the row's leave next. */
	let popupExit: { x: number; y: number } | undefined;
	onCleanup(() => clearTimeout(hoverTimer));

	const tracking = createHoverHandleClose({
		handleClose: safePolygon({ blockPointerEvents: true }),
		domReference: options.triggerElement,
		floating: () => popupElement,
		side: options.side,
		onClose: () => sub.setOpen(false),
	});

	const show = () => {
		if (props.disabled === true) return;
		sub.setOpen(true);
	};
	/** A hover or a mouse click: the parent list ignores the pointer until it reaches the popup. */
	const showByPointer = () => {
		show();
		if (!untrack(sub.open)) return;
		hoverOpened = true;
		tracking.block();
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
	createEffect(() => {
		if (!tracking.blocked()) return;
		options.host.setBlockedIndex(props.index);
		onCleanup(() => {
			if (options.host.blockedIndex() === props.index) {
				options.host.setBlockedIndex(null);
			}
		});
	});
	createEffect(() => {
		if (sub.open()) return;
		hoverOpened = false;
		popupExit = undefined;
		tracking.reset();
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
		hoverTimer = setTimeout(showByPointer, options.hoverOpenMs);
	});

	return {
		/** A click opens immediately, hover mode or not. */
		onSelect() {
			if (options.parent.pointerLit()) showByPointer();
			else show();
		},
		onOpenSubmenu() {
			options.setKeyboardActive(true);
			if (!untrack(sub.open)) hoverOpened = false;
			show();
			sub.enter();
		},
		/** The pointer left the row, or (the popup being inside it) the popup. */
		onMouseLeave(event: DomEvent) {
			if (!sub.open() || !hoverOpened) return;
			if (
				popupExit !== undefined &&
				popupExit.x === event.clientX &&
				popupExit.y === event.clientY
			) {
				popupExit = undefined;
				return;
			}
			if (!tracking.start(event)) sub.setOpen(false);
		},
		popup: {
			/** A function, not a prop: a spread `ref` applies late in gpuix JSX. */
			ref(element: HostElement) {
				popupElement = element;
			},
			props: {
				/** The pointer reached the popup: the parent list takes the pointer back. */
				onMouseEnter(event: DomEvent) {
					popupExit = undefined;
					tracking.enterFloating(event);
				},
				onMouseLeave(event: DomEvent) {
					if (event.clientX === undefined || event.clientY === undefined) {
						throw new Error('mouseleave without coordinates');
					}
					popupExit = { x: event.clientX, y: event.clientY };
					if (tracking.leaveFloating(event)) return;
					if (hoverOpened) sub.setOpen(false);
				},
			},
		},
	};
}
