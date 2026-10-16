import { createRowList } from '../radio-group/row-list';

/** Each row is its own tab stop. Up and Down move focus without toggling, wrapping at both ends; Left and Right do nothing. */
export function createCheckboxGroup() {
	return {
		groupProps: { role: 'group' as const },
		list: createRowList({ arrowsSelect: false }),
	};
}

export type CheckboxGroup = ReturnType<typeof createCheckboxGroup>;
