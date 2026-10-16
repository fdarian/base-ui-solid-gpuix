import type { HostElement, HostMouseMoveEvent, KeyEvent } from '@gpuix/solid';
import {
	type Accessor,
	createEffect,
	createSignal,
	createUniqueId,
	on,
	onCleanup,
} from 'solid-js';
import { createTypeahead } from '../../floating-ui-solid/hooks';
import {
	isChord,
	moveIndex,
	type RevealRect,
	revealRow,
} from '../../internals/composite';
import { createMenuSearch, type MenuSearchProps } from '../input/menu-search';
import type { MenuItemHost, MenuRow } from '../item/menu-item';

/** What lit the highlighted row: the open itself, the pointer or a key. */
export type MenuLitBy = 'open' | 'pointer' | 'keyboard';

/**
 * Why the highlight is being set. `keyboard` and `typeahead` move it by key,
 * `focus` is a row taking focus, `open` is the row an open starts on, and
 * `reset` clears it. The pointer moves the highlight itself (the owner of the
 * hover), so it is never reported here.
 */
export type MenuHighlightReason =
	| 'keyboard'
	| 'typeahead'
	| 'focus'
	| 'open'
	| 'reset';

export interface MenuListPointer {
	onMouseEnter: () => void;
	onMouseMove: (event: HostMouseMoveEvent) => void;
	onMouseLeave: () => void;
}

export interface MenuListOptions {
	/** The list is on screen and not fading out. */
	open: Accessor<boolean>;
	mounted: Accessor<boolean>;
	closeAll: () => void;
	/** Escape: the whole menu for a root, one level for a submenu. */
	closeSelf: () => void;
	isSub: boolean;
	multiple: Accessor<boolean>;
	keyboardActive: Accessor<boolean>;
	setKeyboardActive: (active: boolean) => void;
	/** Tab closes the whole menu; the key handler decides whether focus moves on from the trigger. */
	leave: () => void;
	/** Which end an open lights: ArrowUp on the trigger opens on the last row. */
	openFrom: Accessor<'first' | 'last'>;
	pressPick: () => boolean;
	releasePress: () => void;
	/** The highlighted row, or `null`: controlled by the owner of the hover. */
	highlightedIndex: Accessor<number | null>;
	onHighlightChange: (
		index: number | null,
		reason: MenuHighlightReason,
	) => void;
	/** A row's box in the scroller's content space, to scroll it into view. */
	rowRect: (index: number) => RevealRect | undefined;
	/** Breathing room kept around a revealed row. */
	revealPadding: number;
	/** Height of the search field row that covers the scroller's top edge. */
	searchHeight: number;
	/** The pointer handlers of whatever owns the hover highlight. */
	pointer: MenuListPointer;
	/** A pointer that stops on another row for this long leaves an open submenu. */
	submenuDwellMs: number;
	/** FF focuses the first row two frames after a pointer open, once Base UI's own open focus has landed on the popup. */
	openFocusMs: number;
	/** Rows were added or removed while the list is mounted. */
	onRowsChanged?: () => void;
}

/** Which of the list's rows has its submenu open: the list keeps that row lit under a pointer crossing others. */
export interface MenuSubmenuHost {
	openIndex: Accessor<number | null>;
	setOpenIndex: (index: number | null) => void;
}

/**
 * Keyboard, highlight, typeahead, open focus and the search-field stop for
 * one list of rows (`menu/root/MenuRoot.tsx`'s `useListNavigation` wiring,
 * `menu/popup/MenuPopup.tsx`). The highlight is controlled: `highlightedIndex`
 * is read, `onHighlightChange` asks the owner to move it.
 */
export function createMenuList<
	Search extends MenuSearchProps = MenuSearchProps,
>(options: MenuListOptions) {
	const rows = new Map<number, MenuRow>();
	const listId = createUniqueId();
	const [litBy, setLitBy] = createSignal<MenuLitBy>('open');
	const searchState = createMenuSearch<Search>();
	const search = searchState.search;
	const [openSubIndex, setOpenSubIndex] = createSignal<number | null>(null);
	let scroller: HostElement | undefined;
	let panel: HostElement | undefined;
	let field: HostElement | undefined;
	let dwellTimer: ReturnType<typeof setTimeout> | undefined;
	let lastMove: HostMouseMoveEvent | undefined;
	onCleanup(() => {
		clearTimeout(dwellTimer);
		typeahead.reset();
	});

	const sortedRows = () => [...rows.entries()].sort((a, b) => a[0] - b[0]);
	/** Base UI lets the keyboard land on a disabled row: only activation refuses it. */
	const allRows = () => sortedRows().map((entry) => entry[0]);
	/** Where a fresh open starts: the first row that can be picked. */
	const enabledRows = () =>
		sortedRows()
			.filter((entry) => !entry[1].disabled())
			.map((entry) => entry[0]);

	const revealIndex = (index: number) => {
		const row = options.rowRect(index);
		if (scroller === undefined || row === undefined) return;
		revealRow(
			scroller,
			row,
			'nearest',
			options.revealPadding,
			search() === undefined ? 0 : options.searchHeight,
		);
	};

	/** A field that takes focus on open leaves the rows unlit and unfocused. */
	const fieldTakesFocus = () => {
		const query = search();
		return query !== undefined && query.autoFocus !== false;
	};

	const highlight = (
		index: number | null,
		reason: 'keyboard' | 'typeahead' = 'keyboard',
	) => {
		setLitBy('keyboard');
		options.onHighlightChange(index, reason);
		if (index !== null) revealIndex(index);
	};

	/** The field sits before the first row, so coming back to it from the bottom of a long list also returns the list to its top. */
	const returnToField = () => {
		highlight(null);
		field?.focus({ preventScroll: true });
		if (scroller !== undefined) scroller.scrollTop = 0;
	};

	/** The field is a stop of its own, before the first row: arrowing past either end lands on it. */
	const move = (delta: 1 | -1) => {
		const stops: (number | null)[] = [
			...(search() === undefined ? [] : [null]),
			...allRows(),
		];
		if (stops.length === 0) return;
		const position = stops.indexOf(options.highlightedIndex());
		const next = moveIndex(
			position === -1 ? null : position,
			delta,
			stops.length,
		);
		if (next === null) return;
		const stop = stops.at(next);
		if (stop === undefined) throw new Error('Menu stop out of range');
		if (stop === null) returnToField();
		else highlight(stop);
	};

	/** A key typed on a row (or the bare panel) belongs to the field: it takes focus and the query takes the key. */
	const redirectToField = (event: KeyEvent, query: Search) => {
		const key = event.key;
		if (key === undefined) return false;
		const typed = key.length === 1 && key !== ' ';
		if (!typed && key !== 'Backspace') return false;
		event.preventDefault();
		setLitBy('keyboard');
		options.onHighlightChange(null, 'reset');
		field?.focus({ preventScroll: true });
		query.onValueChange(typed ? query.value + key : query.value.slice(0, -1));
		return true;
	};

	const activateActive = () => {
		const index = options.highlightedIndex();
		if (index === null) return;
		rows.get(index)?.activate();
	};

	const typeahead = createTypeahead({
		labels: () => {
			const last = allRows().at(-1);
			return Array.from(
				{ length: last === undefined ? 0 : last + 1 },
				(_, index) => rows.get(index)?.label,
			);
		},
		current: () => options.highlightedIndex(),
		onMatch: (index) => highlight(index, 'typeahead'),
	});

	const onKey = (event: KeyEvent) => {
		if (isChord(event)) return;
		options.setKeyboardActive(true);
		// The panel is the menu's keyboard: nothing it hears reaches the trigger's
		// wrapper (which would reopen a menu this key just closed) or, from a
		// submenu, the parent menu around it.
		event.stopPropagation();
		const query = search();
		// Space, Home, End and the sideways arrows are the field's own while it has focus.
		const inField = field !== undefined && event.target === field;
		if (event.key === 'Escape') {
			event.preventDefault();
			options.closeSelf();
			return;
		}
		if (event.key === 'Tab') {
			// Forward: the trigger takes focus as the menu closes, so the default Tab moves on from it. Backward leaves it on the trigger.
			if (event.shiftKey === true) event.preventDefault();
			options.leave();
			return;
		}
		if (query === undefined) {
			if (typeahead.handleKey(event)) return;
		} else if (!inField && redirectToField(event, query)) return;
		switch (event.key) {
			case 'ArrowDown':
				event.preventDefault();
				move(1);
				return;
			case 'ArrowUp':
				event.preventDefault();
				move(-1);
				return;
			case 'Home':
				if (inField) return;
				event.preventDefault();
				highlight(allRows()[0] ?? null);
				return;
			case 'End':
				if (inField) return;
				event.preventDefault();
				highlight(allRows().at(-1) ?? null);
				return;
			case 'Enter':
				// Nothing is focused to pick in the field; the default would submit a form around it.
				event.preventDefault();
				if (!inField) activateActive();
				return;
			case ' ':
				if (inField) return;
				event.preventDefault();
				activateActive();
				return;
			case 'ArrowRight': {
				if (inField) return;
				const index = options.highlightedIndex();
				if (index !== null) rows.get(index)?.openSubmenu?.();
				return;
			}
			case 'ArrowLeft':
				if (options.isSub && !inField) options.closeSelf();
				return;
		}
	};

	// While a submenu is open the trigger stays lit whatever row the pointer
	// crosses on its way there; only a pointer that settles on another row
	// takes the highlight, and the submenu goes with it.
	const handlers = {
		onMouseEnter() {
			setLitBy('pointer');
			options.setKeyboardActive(false);
			if (openSubIndex() === null) options.pointer.onMouseEnter();
		},
		onMouseMove(event: HostMouseMoveEvent) {
			setLitBy('pointer');
			options.setKeyboardActive(false);
			if (openSubIndex() === null) {
				options.pointer.onMouseMove(event);
				return;
			}
			lastMove = event;
			clearTimeout(dwellTimer);
			dwellTimer = setTimeout(() => {
				if (lastMove === undefined) return;
				options.pointer.onMouseMove(lastMove);
			}, options.submenuDwellMs);
		},
		onMouseLeave() {
			clearTimeout(dwellTimer);
			// Base UI resets the highlight on pointer leave only while the pointer was the last
			// thing used: closing a submenu under a resting pointer reports a leave too.
			if (litBy() === 'keyboard') return;
			if (openSubIndex() === null) options.pointer.onMouseLeave();
		},
	};

	const itemHost: MenuItemHost = {
		multiple: options.multiple,
		rows,
		rowId: (index) => `${listId}-row-${index}`,
		rowTabIndex: (index) =>
			options.open() && options.highlightedIndex() === index ? 0 : -1,
		rowFocused: (index) => options.onHighlightChange(index, 'focus'),
		pointerLit: () => litBy() === 'pointer',
		rowsChanged() {
			if (!options.mounted()) return;
			options.onRowsChanged?.();
		},
		close: options.closeAll,
		pressPick: options.pressPick,
		releasePress: options.releasePress,
	};

	const lightStart = () => {
		const start =
			options.openFrom() === 'last' ? enabledRows().at(-1) : enabledRows()[0];
		options.onHighlightChange(start ?? null, 'open');
		if (start !== undefined) revealIndex(start);
	};

	// Open ready to act. A search field that takes focus leaves the rows unlit. A keyboard
	// open focuses the first row (ArrowUp: the last); a pointer open focuses the panel,
	// then, like FF's effect, the first row two frames later unless a row already took
	// focus. A submenu the pointer opened leaves focus on its parent row.
	createEffect(
		on(options.open, (isOpen) => {
			if (!isOpen) return;
			setLitBy('open');
			const landing = setTimeout(() => {
				if (!options.open()) return;
				if (fieldTakesFocus()) {
					options.onHighlightChange(null, 'reset');
					return;
				}
				if (options.keyboardActive()) {
					lightStart();
					return;
				}
				if (!options.isSub) panel?.focus({ preventScroll: true });
			}, 0);
			const firstRow = setTimeout(() => {
				if (!options.open() || options.isSub) return;
				if (fieldTakesFocus() || options.keyboardActive()) return;
				if (options.highlightedIndex() !== null) return;
				lightStart();
			}, options.openFocusMs);
			onCleanup(() => {
				clearTimeout(landing);
				clearTimeout(firstRow);
			});
		}),
	);
	// Highlight follows focus and focus follows the highlight: a hover or a key moves
	// the lit row, and the row takes focus. Leaving every row hands focus to the panel.
	createEffect(
		on(options.highlightedIndex, (index) => {
			if (!options.open()) return;
			if (index === null) {
				if (litBy() === 'pointer') panel?.focus({ preventScroll: true });
				return;
			}
			rows.get(index)?.focus();
		}),
	);
	createEffect(() => {
		if (!options.mounted()) options.onHighlightChange(null, 'reset');
	});

	// The query is cleared once the popup has finished closing, so the rows do
	// not refill while it fades out. The field is already gone by then, hence
	// the props it last registered.
	createEffect(
		on(options.mounted, (isMounted) => {
			if (isMounted) return;
			const current = searchState.takeLast();
			if (current === undefined) return;
			if ((current.clearOnClose ?? true) && current.value !== '') {
				current.onValueChange('');
			}
		}),
	);
	// Typing returns to the field: no row stays lit under a re-filtered list.
	createEffect(
		on(
			() => search()?.value,
			() => {
				setLitBy('keyboard');
				options.onHighlightChange(null, 'reset');
			},
			{ defer: true },
		),
	);

	const submenuHost: MenuSubmenuHost = {
		openIndex: openSubIndex,
		setOpenIndex: setOpenSubIndex,
	};

	return {
		itemHost,
		litBy,
		search,
		searchHost: searchState.host,
		submenuHost,
		handlers,
		/** The popup element's role, name and keys (`menu/popup/MenuPopup.tsx`). `id` is the trigger's `aria-controls` target. */
		popupProps(ids: { id: string; labelledBy: string }) {
			return {
				id: ids.id,
				role: 'menu',
				'aria-labelledby': ids.labelledBy,
				// A press on the bare popup, or a pointer open, lands focus here so the keys still reach it.
				tabIndex: -1,
				onKeyDown: onKey,
			} as const;
		},
		lightFirst() {
			highlight(enabledRows()[0] ?? null);
		},
		setScroller(element: HostElement) {
			scroller = element;
		},
		setPanel(element: HostElement) {
			panel = element;
		},
		setField(element: HostElement) {
			field = element;
		},
		containsFocus: () =>
			panel !== undefined && panel.mounted && panel.matches(':focus-within'),
	};
}

export type MenuList = ReturnType<typeof createMenuList>;
