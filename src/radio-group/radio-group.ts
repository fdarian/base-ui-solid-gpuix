import { createMemo, createSignal, onCleanup } from 'solid-js';
import { createRowList } from './row-list';

export interface RadioItemEntry {
	value: string | undefined;
	selected: () => boolean | undefined;
}

export interface RadioGroupOptions {
	value: () => string | undefined;
	selectedIndex: () => number | undefined;
	onValueChange: (value: string) => void;
}

/**
 * Selection takes one of three APIs: `value` + `onValueChange` here,
 * `selectedIndex` here, or `selected` on each item. Arrow keys and Home / End
 * move focus and select the row they land on (Base UI's RadioGroup turns Home
 * and End off; FF selects).
 */
export function createRadioGroup(options: RadioGroupOptions) {
	const list = createRowList({ arrowsSelect: true });
	const [entries, setEntries] = createSignal<
		ReadonlyMap<number, RadioItemEntry>
	>(new Map());

	/** Row index of the selected item, from whichever of the three selection APIs the group is using. */
	const selectedIndex = createMemo(() => {
		const value = options.value();
		if (value !== undefined) {
			for (const [index, entry] of entries()) {
				if (entry.value === value) return index;
			}
			return undefined;
		}
		const index = options.selectedIndex();
		if (index !== undefined) return index;
		for (const [row, entry] of entries()) {
			if (entry.selected() === true) return row;
		}
		return undefined;
	});

	return {
		groupProps: { role: 'radiogroup' as const },
		list,
		value: options.value,
		selectedIndex,
		onValueChange: options.onValueChange,
		registerItem(index: number, entry: RadioItemEntry) {
			setEntries(new Map(entries()).set(index, entry));
			onCleanup(() => {
				if (entries().get(index) !== entry) return;
				const next = new Map(entries());
				next.delete(index);
				setEntries(next);
			});
		},
	};
}

export type RadioGroup = ReturnType<typeof createRadioGroup>;
