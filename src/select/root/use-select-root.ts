import {
	document,
	type HostElement,
	type HostMouseEvent,
	type KeyEvent,
} from '@ghia/solid';
import {
	type Accessor,
	createEffect,
	createSignal,
	createUniqueId,
	on,
	onCleanup,
	untrack,
} from 'solid-js';
import { refocusAfterPress } from '../../floating-ui-solid/hooks/use-click';
import { createTypeahead } from '../../floating-ui-solid/hooks/use-typeahead';
import {
	edgeIndex,
	isChord,
	moveIndex,
	type RevealRect,
	revealRow,
} from '../../internals/composite/composite';
import { createPresence } from '../../internals/use-transition-status';

/** Base UI `SELECTED_DELAY`: a release over a row commits only after the popup has been open this long, or after a drag. */
const PRESS_DRAG_MS = 400;
/** Base UI: a drag of 8px over the rows enables the release commit early. */
const PRESS_DRAG_PX = 8;
/** Base UI's gate for the row focus ring (`POPUP_NAV_KEYS`): these keys inside the popup earn it, typeahead letters do not. */
const NAV_KEYS = [
	'ArrowDown',
	'ArrowUp',
	'ArrowLeft',
	'ArrowRight',
	'Home',
	'End',
	'PageUp',
	'PageDown',
];

export interface SelectRootItem<Value extends string> {
	value: Value;
	label: string;
	disabled?: boolean;
}

/**
 * Why the highlight moved. `reset` is open and close, `focus` is a row taking
 * focus. Pointer highlights never come through here: the pointer owns them
 * (the caller's hover) and the primitive only reads the result.
 */
export type SelectHighlightReason =
	| 'keyboard'
	| 'typeahead'
	| 'focus'
	| 'reset';

export interface SelectRootOptions<
	Value extends string,
	Item extends SelectRootItem<Value>,
> {
	/** The pickable rows only, in highlight-index order. */
	items: Accessor<readonly Item[]>;
	/** Controlled value. Returning `undefined`, the select keeps its own, starting at `defaultValue`. */
	value: Accessor<Value | null | undefined>;
	defaultValue?: Value | null;
	onValueChange?: (value: Value) => void;
	disabled: Accessor<boolean>;
	required: Accessor<boolean | undefined>;
	invalid: Accessor<boolean>;
	/** The `id` of the element that labels the trigger. */
	labelledBy: Accessor<string | undefined>;
	/** The trigger's accessible name, for a select with no visible label. */
	label: Accessor<string | undefined>;
	/** How long the popup stays mounted after it closes, for its exit. */
	exitMs: number;
	/** How long a pick holds the popup open before it closes. FF only: Base UI closes at once. */
	pickHoldMs: number;
	highlightedIndex: Accessor<number | null>;
	onHighlightChange: (
		index: number | null,
		reason: SelectHighlightReason,
	) => void;
	/** Each row's box in the scroller's content space; the highlighted row is scrolled into view with these. */
	itemRects: Accessor<readonly (RevealRect | undefined)[]>;
	/** Breathing room, in px, between a revealed row and the scroller's edge. */
	scrollPadding: number;
}

/**
 * Base UI's `useSelectRoot` for a data-driven list: open state, value,
 * highlight-follows-focus, typeahead, keyboard navigation, drag-to-pick (press
 * the trigger, drag onto a row and release) and the dismissal wiring. Spread
 * `triggerProps`, `popupProps` and `itemProps(item, index)` on the elements;
 * the caller draws everything and owns the pointer highlight.
 */
export function createSelectRoot<
	Value extends string,
	Item extends SelectRootItem<Value>,
>(options: SelectRootOptions<Value, Item>) {
	const presence = createPresence(options.exitMs);
	const triggerId = createUniqueId();
	const popupId = createUniqueId();
	const itemId = (index: number) => `${popupId}-row-${index}`;
	const [ownValue, setOwnValue] = createSignal<Value | null>(
		options.defaultValue ?? null,
	);
	const value = () => {
		const controlled = options.value();
		return controlled === undefined ? ownValue() : controlled;
	};
	/** The row focus ring is earned: by a keyboard open and by navigation keys inside the popup (Base UI's `useKeyboardNavGate`). A focus that is also `:focus-visible` then draws it. */
	let keyboardNav = false;
	let triggerElement: HostElement | undefined;
	/** The popup panel: the scrolling listbox, which holds focus while no row does. */
	let scroller: HostElement | undefined;
	const itemElements = new Map<number, HostElement>();
	/** Set on open: the highlighted row is scrolled into view once its rect has been measured. */
	let revealOnMeasure = false;
	let pickTimer: ReturnType<typeof setTimeout> | undefined;
	let openedAt = 0;
	/** The row a press began on, so its click commits but a release that began elsewhere is judged by the drag rules. */
	let pressedIndex: number | null = null;
	let dragY = 0;
	let dragFromY: number | undefined;
	let dragCommits = false;
	onCleanup(() => clearTimeout(pickTimer));

	const selectedIndex = () => {
		const current = value();
		if (current === null) return -1;
		return options.items().findIndex((item) => item.value === current);
	};
	const commitValue = (item: Item) => {
		if (options.value() === undefined) setOwnValue(() => item.value);
		options.onValueChange?.(item.value);
	};
	const itemAt = (index: number) => {
		const item = options.items()[index];
		if (item === undefined) throw new Error(`No item at ${index}`);
		return item;
	};
	const isItemDisabled = (index: number) => itemAt(index).disabled === true;

	const revealIndex = (index: number) => {
		const rect = options.itemRects()[index];
		if (scroller === undefined) throw new Error('Select list is not mounted');
		if (rect !== undefined)
			revealRow(scroller, rect, 'nearest', options.scrollPadding);
	};
	const highlight = (index: number, reason: 'keyboard' | 'typeahead') => {
		options.onHighlightChange(index, reason);
		revealIndex(index);
	};

	const typeahead = createTypeahead({
		labels: () => options.items().map((item) => item.label),
		current: () =>
			selectedIndex() === -1 ? options.highlightedIndex() : selectedIndex(),
		isDisabled: isItemDisabled,
		onMatch: (index) => {
			// Closed, Base UI commits the match as the value and does not open.
			if (!presence.open()) {
				commitValue(itemAt(index));
				return;
			}
			highlight(index, 'typeahead');
		},
	});
	onCleanup(typeahead.reset);

	/** Where the highlight starts: the picked row; else, for a keyboard open, the first (or last) enabled one. */
	const openHighlight = (from: 'pointer' | 'down' | 'up') => {
		if (selectedIndex() !== -1) return selectedIndex();
		if (from === 'pointer') return null;
		return edgeIndex(
			from === 'down' ? 'first' : 'last',
			options.items().length,
			isItemDisabled,
		);
	};
	const focusPanel = () => {
		if (scroller !== undefined && scroller.mounted) {
			scroller.focus({ preventScroll: true });
		}
	};
	const open = (from: 'pointer' | 'down' | 'up' = 'pointer') => {
		if (options.disabled() || presence.open()) return;
		revealOnMeasure = true;
		openedAt = performance.now();
		pressedIndex = null;
		dragY = 0;
		dragFromY = undefined;
		dragCommits = false;
		keyboardNav = from !== 'pointer';
		typeahead.reset();
		presence.show();
		const index = openHighlight(from);
		options.onHighlightChange(index, 'reset');
		// A pointer open with no value has no row to focus, so the panel takes it.
		if (index === null) focusPanel();
		else itemElements.get(index)?.focus({ preventScroll: true });
	};
	/** Hands focus back to the trigger when it sat in the popup (which unmounts and drops it) or nowhere; a control that took it since keeps it (Base UI's `returnFocus`). */
	const returnFocus = () => {
		if (triggerElement === undefined || !triggerElement.mounted) return;
		const inPopup =
			scroller !== undefined &&
			scroller.mounted &&
			scroller.matches(':focus-within');
		if (inPopup || document.activeElement === null) triggerElement.focus();
	};
	const close = () => {
		clearTimeout(pickTimer);
		if (!presence.open()) return;
		presence.hide();
		typeahead.reset();
		returnFocus();
	};
	const pick = (item: Item) => {
		if (item.disabled === true) return;
		commitValue(item);
		clearTimeout(pickTimer);
		pickTimer = setTimeout(close, options.pickHoldMs);
	};

	/** Arrow keys stop at the ends and visit disabled rows, like Base UI's `loopFocus: false` with `disabledIndices: []`. */
	const move = (delta: 1 | -1) => {
		const next = moveIndex(
			options.highlightedIndex(),
			delta,
			options.items().length,
			undefined,
			false,
		);
		if (next === null) return;
		highlight(next, 'keyboard');
	};
	/** The closed trigger's keys: open, or commit a typeahead match. */
	const onTriggerKeyDown = (event: KeyEvent) => {
		if (isChord(event) || presence.open()) return;
		// Typeahead first: Space inside a session continues it instead of opening.
		if (typeahead.handleKey(event)) {
			event.preventDefault();
			event.stopPropagation();
			return;
		}
		switch (event.key) {
			case 'Enter':
			case ' ':
				open('down');
				return;
			case 'ArrowDown':
			case 'ArrowUp':
				event.preventDefault();
				event.stopPropagation();
				open(event.key === 'ArrowDown' ? 'down' : 'up');
				return;
		}
	};
	/** The open popup's keys: a row holds focus, so its keys bubble here. */
	const onPopupKeyDown = (event: KeyEvent) => {
		if (isChord(event)) return;
		event.stopPropagation();
		if (event.key !== undefined && NAV_KEYS.includes(event.key))
			keyboardNav = true;
		if (typeahead.handleKey(event)) {
			event.preventDefault();
			return;
		}
		switch (event.key) {
			case 'Enter':
			case ' ': {
				event.preventDefault();
				const index = options.highlightedIndex();
				if (index !== null) pick(itemAt(index));
				return;
			}
			case 'ArrowDown':
				event.preventDefault();
				move(1);
				return;
			case 'ArrowUp':
				event.preventDefault();
				move(-1);
				return;
			case 'Home':
			case 'End':
				event.preventDefault();
				if (options.items().length > 0)
					highlight(
						event.key === 'Home' ? 0 : options.items().length - 1,
						'keyboard',
					);
				return;
			case 'Escape':
				// Closing pops the popup's dismiss layer before the window sees this Escape, which would then close the dialog behind.
				event.preventDefault();
				close();
				return;
			case 'Tab':
				// Forward: the trigger takes focus first, so the default Tab moves on from it. Backward leaves it on the trigger.
				if (event.shiftKey === true) event.preventDefault();
				close();
				return;
		}
	};
	const onTriggerMouseDown = (event: HostMouseEvent) => {
		if (event.button !== undefined && event.button !== 0) return;
		// Cancels the focus move the press would make, which would pull focus back from the popup `open` just focused. Windows and Linux run this handler after native moved focus, where it changes nothing.
		event.preventDefault();
		if (presence.open()) close();
		else open('pointer');
	};
	/** Press on the trigger, drag onto a row and release picks it: at once after a drag of 8px, else after 400 ms. */
	const onItemMouseUp = (item: Item, index: number) => {
		dragY = 0;
		dragFromY = undefined;
		if (item.disabled === true || pressedIndex === index) return;
		const settled = performance.now() - openedAt >= PRESS_DRAG_MS;
		const allowed = value() === item.value ? settled : settled || dragCommits;
		if (allowed) pick(item);
	};
	/** Feed the rows' container its mouse moves, next to the caller's own hover handling. */
	const onListMouseMove = (event: HostMouseEvent) => {
		if (event.pressedButton !== 0 || event.y === undefined) {
			dragFromY = undefined;
			return;
		}
		if (dragFromY !== undefined) dragY += event.y - dragFromY;
		dragFromY = event.y;
		if (dragY ** 2 >= PRESS_DRAG_PX ** 2) dragCommits = true;
	};

	createEffect(
		on(options.itemRects, () => {
			if (!revealOnMeasure) return;
			revealOnMeasure = false;
			const index = options.highlightedIndex();
			if (index !== null) revealIndex(index);
		}),
	);
	// Highlight follows focus and focus follows the highlight: a hover or a key lights a row and the row takes focus. Leaving every row hands focus to the panel.
	createEffect(
		on(
			options.highlightedIndex,
			(index) => {
				if (!presence.open()) return;
				if (index === null) focusPanel();
				else itemElements.get(index)?.focus({ preventScroll: true });
			},
			{ defer: true },
		),
	);
	createEffect(() => {
		if (presence.mounted()) return;
		untrack(() => options.onHighlightChange(null, 'reset'));
	});

	return {
		presence,
		value,
		selectedIndex,
		open,
		close,
		/** Whether navigation keys (or a keyboard open) have earned the rows their focus ring. */
		keyboardNav: () => keyboardNav,
		triggerElement: () => triggerElement,
		// The refs are not in the prop objects: JSX spread applies a `ref` in an effect after the element is created, and the open reads these as the popup mounts. Pass them as `ref={...}` on the element.
		triggerRef(element: HostElement) {
			triggerElement = element;
		},
		popupRef(element: HostElement) {
			scroller = element;
		},
		itemRef(index: number, element: HostElement) {
			itemElements.set(index, element);
		},
		onListMouseMove,
		/** Spread on the element that holds both the trigger and the popup: an outside press closes. */
		dismissProps: {
			onMouseDownOutside() {
				if (!presence.open()) return;
				close();
				refocusAfterPress(triggerElement);
			},
		},
		triggerProps: {
			id: triggerId,
			role: 'combobox' as const,
			'aria-haspopup': 'listbox' as const,
			get 'aria-expanded'() {
				return presence.open();
			},
			get 'aria-controls'() {
				return presence.open() ? popupId : undefined;
			},
			get 'aria-labelledby'() {
				return options.labelledBy();
			},
			get 'aria-label'() {
				return options.label();
			},
			get 'aria-required'() {
				return options.required();
			},
			get 'aria-invalid'() {
				return options.invalid();
			},
			get 'aria-disabled'() {
				return options.disabled();
			},
			get tabIndex() {
				return options.disabled() ? -1 : 0;
			},
			onMouseDown: onTriggerMouseDown,
			onKeyDown: onTriggerKeyDown,
		},
		/** The scrolling listbox. */
		popupProps: {
			id: popupId,
			role: 'listbox' as const,
			// A pointer open, and a pointer leaving every row, land focus here so the keys still reach it.
			tabIndex: -1,
			onKeyDown: onPopupKeyDown,
		},
		itemProps(item: Item, index: number) {
			return {
				id: itemId(index),
				role: 'option' as const,
				get tabIndex() {
					return presence.open() && options.highlightedIndex() === index
						? 0
						: -1;
				},
				get 'aria-selected'() {
					return value() === item.value;
				},
				'aria-disabled': item.disabled === true,
				onFocus() {
					options.onHighlightChange(index, 'focus');
				},
				onMouseDown() {
					pressedIndex = index;
					dragY = 0;
				},
				onMouseUp() {
					onItemMouseUp(item, index);
				},
				onClick() {
					if (pressedIndex !== index) return;
					pressedIndex = null;
					pick(item);
				},
			};
		},
	};
}
