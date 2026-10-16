import { createUniqueId } from 'solid-js';
import type { CheckboxGroup } from '../../checkbox-group/checkbox-group';
import type { RowItem } from '../../internals/composite';

export interface CheckboxRootOptions {
	index: number;
	label: () => string;
	checked: () => boolean;
	onCheckedChange: (checked: boolean) => void;
}

/** One checkbox row. Space and Enter toggle on keydown (Base UI blocks Enter and toggles Space on keyup; FF toggles on both keys at once). */
export function createCheckboxRoot(
	group: CheckboxGroup,
	options: CheckboxRootOptions,
): RowItem {
	const toggle = () => options.onCheckedChange(!options.checked());
	return {
		checked: options.checked,
		rowProps: {
			id: createUniqueId(),
			role: 'checkbox',
			get 'aria-checked'() {
				return options.checked();
			},
			get 'aria-label'() {
				return options.label();
			},
			tabIndex: 0,
			onClick: toggle,
			onKeyDown: (event) =>
				group.list.handleKeyDown(options.index, toggle, event),
		},
		register(element) {
			group.list.registerRow(options.index, { element, activate: toggle });
		},
	};
}
