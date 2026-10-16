import {
	type DomEvent,
	type HostElement,
	type HostMouseEvent,
	type KeyEvent,
	useGpuixRequired,
} from '@gpuix/solid';
import {
	type Accessor,
	createEffect,
	createMemo,
	createSignal,
	createUniqueId,
	on,
} from 'solid-js';
import {
	isChord,
	moveIndex,
	type RevealRect,
	revealRow,
} from '../../internals/composite/composite';
import { createPresence } from '../../internals/use-transition-status';
import { contains } from './utils/filter';

export interface ComboboxRootItem {
	value: string;
	label: string;
	disabled?: boolean;
}

/**
 * Why the highlight moved. `reset` is open, a changed filter and the pointer
 * leaving the list. Pointer highlights never come through here: the pointer
 * owns them (the caller's hover) and the primitive only reads the result.
 */
export type ComboboxHighlightReason = 'keyboard' | 'reset';

export interface ComboboxRootOptions<Item extends ComboboxRootItem> {
	items: Accessor<readonly Item[]>;
	/** Controlled value. Returning `undefined`, the combobox keeps its own, starting at `defaultValue`. */
	value: Accessor<string | null | undefined>;
	defaultValue?: string | null;
	onValueChange?: (value: string | null) => void;
	disabled: Accessor<boolean>;
	required: Accessor<boolean | undefined>;
	/** The `id` of the element that labels the field. */
	labelledBy: Accessor<string | undefined>;
	/** Whether a row matches the typed query. Default: Base UI's collator `contains` on the label. */
	filter: Accessor<((item: Item, query: string) => boolean) | undefined>;
	/** How long the popup stays mounted after it closes, for its exit. */
	exitMs: number;
	highlightedIndex: Accessor<number | null>;
	onHighlightChange: (
		index: number | null,
		reason: ComboboxHighlightReason,
	) => void;
	/** Each row's box in the scroller's content space; the highlighted row is scrolled into view with these. */
	itemRects: Accessor<readonly (RevealRect | undefined)[]>;
	/** Breathing room, in px, between a revealed row and the scroller's edge. */
	scrollPadding: number;
	/** Typing re-filtered the rows under the highlight: called before the highlight resets, so the caller can have the overlays snap instead of glide. */
	onFilterReflow?: () => void;
}

/**
 * Base UI's `AriaCombobox` for a single-select, data-driven list: a text field
 * that filters the rows as you type, the open state, the picked value and the
 * text that follows it, `autoHighlight="always"` (the first or picked row is lit
 * on open, after a filter and when the pointer leaves the list) and keyboard
 * navigation. Focus never leaves the input; the lit row is named by
 * `aria-activedescendant`. Spread `inputProps`, `triggerProps`, `clearProps`,
 * `listProps` and `itemProps(item, index)` on the elements; the caller draws
 * everything and owns the pointer highlight.
 */
export function createComboboxRoot<Item extends ComboboxRootItem>(
	options: ComboboxRootOptions<Item>,
) {
	const renderer = useGpuixRequired();
	const presence = createPresence(options.exitMs);
	const listId = createUniqueId();
	// Not inline in the JSX: that prop re-evaluates with the others, so the input would get a new id on every highlight change.
	const inputId = createUniqueId();
	const itemId = (index: number) => `${listId}-row-${index}`;
	const open = presence.open;
	const mounted = presence.mounted;
	const [ownValue, setOwnValue] = createSignal<string | null>(
		options.defaultValue ?? null,
	);
	const value = () => {
		const controlled = options.value();
		return controlled === undefined ? ownValue() : controlled;
	};
	const labelOf = (current: string | null) => {
		if (current === null) return '';
		const item = options
			.items()
			.find((candidate) => candidate.value === current);
		if (item === undefined) throw new Error(`No item for ${current}`);
		return item.label;
	};
	const [inputText, setInputText] = createSignal(labelOf(value()));
	// What the list filters by. The text field shows the selected label while
	// closed, but opening it must still list every item.
	const [query, setQuery] = createSignal('');

	let inputElement: HostElement | undefined;
	let scroller: HostElement | undefined;
	/** Set on open: the highlighted row is scrolled into view once its rect has been measured. */
	let revealOnMeasure = false;

	const filtered = createMemo(() => {
		const needle = query().trim();
		if (needle === '') return options.items();
		const matches =
			options.filter() ?? ((item, text) => contains(item.label, text));
		return options.items().filter((item) => matches(item, needle));
	});
	const checkedIndex = createMemo(() => {
		const index = filtered().findIndex((item) => item.value === value());
		return index === -1 ? null : index;
	});

	/** Focus stays in the field while the arrows walk the rows, so it names the lit one. */
	const litItemId = () => {
		const index = options.highlightedIndex();
		return open() && index !== null ? itemId(index) : undefined;
	};
	const listShown = () => open() && filtered().length > 0;

	const commitValue = (next: string | null) => {
		if (options.value() === undefined) setOwnValue(next);
		options.onValueChange?.(next);
	};
	/** Where the highlight starts on open: the picked row, else the first (`autoHighlight="always"`). */
	const openHighlight = () => {
		const picked = options.items().findIndex((item) => item.value === value());
		if (picked !== -1) return picked;
		return options.items().length === 0 ? null : 0;
	};
	const openPopup = () => {
		if (open() || options.disabled()) return;
		setQuery('');
		revealOnMeasure = true;
		presence.show();
		options.onHighlightChange(openHighlight(), 'reset');
	};
	const closePopup = () => {
		if (!open()) return;
		presence.hide();
		setInputText(labelOf(value()));
	};
	const focusInput = () => {
		if (inputElement === undefined)
			throw new Error('Combobox input is not mounted');
		renderer.focusElement?.(inputElement.id);
	};
	const select = (item: Item) => {
		if (item.disabled === true) return;
		commitValue(item.value);
		setInputText(item.label);
		closePopup();
	};
	const clear = () => {
		commitValue(null);
		setInputText('');
		setQuery('');
		focusInput();
	};

	// The field follows a value that changed from outside.
	createEffect(
		on(
			value,
			(next) => {
				const label = labelOf(next);
				if (inputText() !== label) setInputText(label);
			},
			{ defer: true },
		),
	);

	// Typing re-filters rows underneath the overlays, so the first row is the
	// target again (the picked row once the text is emptied) and the new rects
	// replace the old ones without a glide.
	createEffect(
		on(
			filtered,
			() => {
				if (!mounted()) return;
				options.onFilterReflow?.();
				if (scroller !== undefined && scroller.mounted) {
					scroller.scrollTo({ top: 0, left: 0 });
				}
				if (filtered().length === 0) {
					options.onHighlightChange(null, 'reset');
					return;
				}
				const picked = query().trim() === '' ? checkedIndex() : null;
				options.onHighlightChange(picked ?? 0, 'reset');
			},
			{ defer: true },
		),
	);
	createEffect(
		on(
			options.itemRects,
			() => {
				if (!revealOnMeasure) return;
				revealOnMeasure = false;
				const index = options.highlightedIndex();
				if (index !== null) revealIndex(index);
			},
			{ defer: true },
		),
	);

	const revealIndex = (index: number) => {
		const rect = options.itemRects()[index];
		if (scroller !== undefined && rect !== undefined) {
			revealRow(scroller, rect, 'nearest', options.scrollPadding);
		}
	};
	/** Arrows loop (`loopFocus` is on) and visit disabled rows (`disabledIndices: []`). */
	const move = (delta: 1 | -1) => {
		const next = moveIndex(
			options.highlightedIndex(),
			delta,
			filtered().length,
		);
		if (next === null) return;
		options.onHighlightChange(next, 'keyboard');
		revealIndex(next);
	};

	const onKeyDown = (event: KeyEvent) => {
		if (isChord(event)) return;
		switch (event.key) {
			case 'ArrowDown':
			case 'ArrowUp':
				event.preventDefault();
				event.stopPropagation();
				if (!open()) openPopup();
				else move(event.key === 'ArrowDown' ? 1 : -1);
				return;
			case 'Escape':
				if (open()) {
					// Closing pops the popup's dismiss layer before the window sees this Escape, which would then close the dialog behind.
					event.preventDefault();
					closePopup();
					return;
				}
				if (mounted()) return;
				// Closed: Escape empties the field and the pick. With a pick to clear it is consumed, so a dialog behind stays open.
				setInputText('');
				setQuery('');
				if (value() !== null) {
					commitValue(null);
					event.preventDefault();
					event.stopPropagation();
				}
				return;
			case 'Tab':
				closePopup();
				return;
			case 'Enter':
				submit(event);
				return;
		}
	};
	/** Enter only belongs to the combobox when it picks a row; closed, or with no row lit, it passes on so the form submits. */
	const submit = (event: KeyEvent) => {
		if (!open()) return;
		const index = options.highlightedIndex();
		if (index === null) {
			closePopup();
			return;
		}
		event.preventDefault();
		const item = filtered()[index];
		if (item !== undefined) select(item);
	};
	const onChange = (event: DomEvent) => {
		const text = event.value;
		if (text === undefined) throw new Error('Combobox change without a value');
		setInputText(text);
		// Emptying the field drops the pick.
		if (text === '' && value() !== null) commitValue(null);
		if (open()) {
			setQuery(text);
			return;
		}
		if (text.trim() === '') return;
		openPopup();
		setQuery(text);
	};
	/** Call when the pointer leaves the rows, after the caller's hover has dropped its highlight. `autoHighlight="always"` refills a dropped highlight with the first row, so Enter always has a target. */
	const onListMouseLeave = () => {
		if (filtered().length > 0) options.onHighlightChange(0, 'reset');
	};

	return {
		presence,
		open,
		mounted,
		value,
		filtered,
		checkedIndex,
		openPopup,
		closePopup,
		onListMouseLeave,
		/** Spread on the element that holds the field and the popup: an outside press closes. */
		dismissProps: {
			onMouseDownOutside: closePopup,
		},
		/** The field around the input and its buttons: a press anywhere on it focuses the input and opens. */
		inputGroupProps: {
			onMouseDown() {
				focusInput();
				openPopup();
			},
		},
		inputProps: {
			ref(element: HostElement) {
				inputElement = element;
			},
			id: inputId,
			get value() {
				return inputText();
			},
			role: 'combobox' as const,
			'aria-haspopup': 'listbox' as const,
			get 'aria-expanded'() {
				return open();
			},
			get 'aria-controls'() {
				return listShown() ? listId : undefined;
			},
			'aria-autocomplete': 'list' as const,
			get 'aria-activedescendant'() {
				return litItemId();
			},
			get 'aria-labelledby'() {
				return options.labelledBy();
			},
			get 'aria-required'() {
				return options.required();
			},
			get 'aria-disabled'() {
				return options.disabled();
			},
			get readOnly() {
				return options.disabled();
			},
			get tabIndex() {
				return options.disabled() ? -1 : undefined;
			},
			onMouseDown: openPopup,
			onChange,
			onKeyDown,
		},
		inputElement: () => inputElement,
		/** The chevron: a press toggles and always focuses the input. */
		triggerProps: {
			role: 'button' as const,
			'aria-label': 'Open',
			onMouseDown() {
				focusInput();
				if (open()) closePopup();
				else openPopup();
			},
		},
		clearProps: {
			role: 'button' as const,
			'aria-label': 'Clear',
			onClick: clear,
		},
		/** The scrolling listbox. */
		listProps: {
			ref(element: HostElement) {
				scroller = element;
			},
			id: listId,
			role: 'listbox' as const,
		},
		itemProps(item: Item, index: number) {
			return {
				id: itemId(index),
				role: 'option' as const,
				get 'aria-selected'() {
					return value() === item.value;
				},
				'aria-disabled': item.disabled === true,
				// A press on a row must not take focus from the input (Base UI `ComboboxItem`).
				onMouseDown(event: HostMouseEvent) {
					event.preventDefault();
				},
				onClick() {
					select(item);
				},
			};
		},
	};
}
