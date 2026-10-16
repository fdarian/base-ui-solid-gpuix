import type { DomEvent, HostElement } from '@gpuix/solid';
import { type Accessor, createEffect, onCleanup } from 'solid-js';

/** What the keyboard needs to know about a row the pointer would otherwise be the only one to reach. */
export interface MenuRow {
	label: string;
	disabled: () => boolean;
	activate: () => void;
	/** ArrowRight on a submenu trigger. */
	openSubmenu?: () => void;
	/** Moves real focus to the row without scrolling it into view. */
	focus: () => void;
	/** The row's element, to tell whether a focus move stayed among the rows. */
	element: () => HostElement | undefined;
}

/** What a row reads from the list it sits in (`createMenuList` provides it). */
export interface MenuItemHost {
	/** `checkedIndices` was given: rows are checkboxes and stay open on select. */
	multiple: Accessor<boolean>;
	rows: Map<number, MenuRow>;
	/** The DOM `id` of a row. */
	rowId: (index: number) => string;
	/** The roving `tabIndex`: 0 on the one tab stop, -1 on every other row. */
	rowTabIndex: (index: number) => 0 | -1;
	/** A row took focus (arrows, hover, Tab or a press): it becomes the lit one. `focusVisible` is false for a press. */
	rowFocused: (index: number, focusVisible: boolean) => void;
	/** The highlight is where the pointer put it, not the keyboard or the open itself. */
	pointerLit: Accessor<boolean>;
	/** Rows were added or removed: the measured rects are stale, and the tab stop may have moved. */
	rowsChanged?: () => void;
	/** Closes the whole menu. A no-op for the inline panel. */
	close: () => void;
	/** A row released under a press that began on the menu's trigger picks, once. Always false for the inline panel. */
	pressPick: () => boolean;
	/** Any other press on a row ends that trigger press. */
	releasePress: () => void;
}

export interface MenuItemProps {
	label: string;
	index: number;
	/** Set it, even to `false`, for a radio row (or a checkbox row under `checkedIndices`). Leave it out for a plain action. */
	checked?: boolean;
	onSelect?: () => void;
	disabled?: boolean;
	/** Close on select. Defaults to `false` under `checkedIndices`. */
	closeOnClick?: boolean;
	/** ArrowRight on a submenu trigger. */
	onOpenSubmenu?: () => void;
	/** A submenu trigger: whether its popup is open and what it is called. */
	submenu?: { open: boolean; popupId: string };
}

/**
 * A row's registration in its list, activation and ARIA
 * (`menu/item/useMenuItem.ts`, `useMenuItemCommonProps.ts`, and the radio and
 * checkbox item roles). Spread `props` on the row and hand its element over
 * with `setElement`.
 */
export function createMenuItem(host: MenuItemHost, props: MenuItemProps) {
	let rowElement: HostElement | undefined;

	/** A keyboard activation of a submenu trigger goes into the submenu; a click opens it through `onSelect`. */
	const activate = (fromKeyboard: boolean) => {
		if (props.disabled === true) return;
		if (fromKeyboard && props.onOpenSubmenu !== undefined) {
			props.onOpenSubmenu();
			return;
		}
		props.onSelect?.();
		if (props.closeOnClick ?? !host.multiple()) host.close();
	};
	/** The release already picked the row; the click that may follow it must not pick twice. */
	let pickedOnRelease = false;

	createEffect(() => {
		const index = props.index;
		const row: MenuRow = {
			label: props.label,
			disabled: () => props.disabled === true,
			activate: () => activate(true),
			openSubmenu: props.onOpenSubmenu,
			focus: () => rowElement?.focus({ preventScroll: true }),
			element: () => rowElement,
		};
		host.rows.set(index, row);
		host.rowsChanged?.();
		onCleanup(() => {
			if (host.rows.get(index) === row) host.rows.delete(index);
			host.rowsChanged?.();
		});
	});

	const role = () => {
		if (props.checked === undefined) return 'menuitem';
		return host.multiple() ? 'menuitemcheckbox' : 'menuitemradio';
	};

	return {
		element: () => rowElement,
		setElement(element: HostElement) {
			rowElement = element;
		},
		props: {
			get id() {
				return host.rowId(props.index);
			},
			get role() {
				return role();
			},
			get tabIndex() {
				return host.rowTabIndex(props.index);
			},
			onFocus(event: DomEvent) {
				host.rowFocused(props.index, event.focusVisible === true);
			},
			get 'aria-checked'() {
				return props.checked;
			},
			get 'aria-disabled'() {
				return props.disabled === true;
			},
			get 'aria-haspopup'() {
				return props.submenu === undefined ? undefined : 'menu';
			},
			get 'aria-expanded'() {
				return props.submenu?.open;
			},
			get 'aria-controls'() {
				return props.submenu?.open ? props.submenu.popupId : undefined;
			},
			onMouseDown() {
				pickedOnRelease = false;
				host.releasePress();
			},
			onMouseUp() {
				if (!host.pressPick()) return;
				pickedOnRelease = true;
				activate(false);
			},
			onClick() {
				if (pickedOnRelease) {
					pickedOnRelease = false;
					return;
				}
				activate(false);
			},
		},
	};
}
