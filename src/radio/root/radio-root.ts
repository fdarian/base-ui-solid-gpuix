import { createUniqueId } from 'solid-js';
import type { RadioGroup } from '../../radio-group/radio-group';
import type { RowItem } from '../../internals/composite';

export interface RadioRootOptions {
	index: number;
	label: () => string;
	value: () => string | undefined;
	selected: () => boolean | undefined;
	onSelect: () => void;
}

/**
 * One radio row. Space and Enter select (Base UI blocks Enter; FF selects),
 * re-selecting the checked row fires `onValueChange` again, and the tab stop
 * roves: the selected row, or the first while nothing is selected so the group
 * stays reachable by keyboard.
 */
export function createRadioRoot(
	group: RadioGroup,
	options: RadioRootOptions,
): RowItem & { tabbable: () => boolean; select: () => void } {
	group.registerItem(options.index, {
		value: options.value(),
		selected: options.selected,
	});

	// Value equality decides when both the item and the group have a value; otherwise the item's own `selected` wins over the group's index.
	const checked = () => {
		const groupValue = group.value();
		const value = options.value();
		if (value !== undefined && groupValue !== undefined) {
			return groupValue === value;
		}
		return options.selected() ?? group.selectedIndex() === options.index;
	};
	const tabbable = () => {
		const selected = group.selectedIndex();
		return selected === undefined ? options.index === 0 : checked();
	};
	const select = () => {
		const value = options.value();
		if (value !== undefined) group.onValueChange(value);
		options.onSelect();
	};

	return {
		checked,
		tabbable,
		select,
		rowProps: {
			id: createUniqueId(),
			role: 'radio',
			get 'aria-checked'() {
				return checked();
			},
			get 'aria-label'() {
				return options.label();
			},
			get tabIndex() {
				return tabbable() ? 0 : -1;
			},
			onClick: select,
			onKeyDown: (event) =>
				group.list.handleKeyDown(options.index, select, event),
		},
		register(element) {
			group.list.registerRow(options.index, { element, activate: select });
		},
	};
}
