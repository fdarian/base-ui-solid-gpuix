import {
	type HostElement,
	type KeyEvent,
	useGpuixRequired,
} from '@gpuix/solid';
import { onCleanup } from 'solid-js';

/**
 * No upstream file: stands in for CompositeRoot's key handling over a list of
 * rows that radio-group and checkbox-group share. Kept beside
 * `use-composite-root.ts` rather than merged into it: rows are ordered by
 * index (not registration order), Space and Enter activate, a landed-on row is
 * activated when `arrowsSelect`, both axes' arrows work, and no modifier
 * guard or `stopPropagation` applies.
 */

export interface RowEntry {
	element: HostElement;
	activate: () => void;
}

/** What a row primitive hands the row element: the props to spread on it, and its registration once it is mounted. */
export interface RowItem {
	checked: () => boolean;
	rowProps: {
		id: string;
		role: 'checkbox' | 'radio';
		readonly 'aria-checked': boolean;
		readonly 'aria-label': string;
		readonly tabIndex: number;
		onClick: () => void;
		onKeyDown: (event: KeyEvent) => void;
	};
	/** Call from an effect with the mounted element; the registration ends with that effect's scope. */
	register: (element: HostElement) => void;
}

export function createRowList(options: {
	/** Arrow keys select the row they land on, as native radios do. */
	arrowsSelect: boolean;
}) {
	const renderer = useGpuixRequired();
	const focusElement = renderer.focusElement;
	if (focusElement === undefined) {
		throw new Error('This renderer does not expose focusElement');
	}
	const rows = new Map<number, RowEntry>();

	const registerRow = (index: number, entry: RowEntry) => {
		rows.set(index, entry);
		onCleanup(() => {
			if (rows.get(index) === entry) rows.delete(index);
		});
	};

	/** Moves focus `step` rows on, wrapping; `"first"` / `"last"` jump. */
	const focusFrom = (index: number, step: number | 'first' | 'last') => {
		const order = [...rows.keys()].sort((a, b) => a - b);
		if (order.length === 0) return;
		const position = order.indexOf(index);
		const target =
			step === 'first'
				? 0
				: step === 'last'
					? order.length - 1
					: (position + step + order.length) % order.length;
		const targetIndex = order[target];
		if (targetIndex === undefined) throw new Error('No row to focus');
		const entry = rows.get(targetIndex);
		if (entry === undefined) throw new Error(`No row at ${targetIndex}`);
		focusElement.call(renderer, entry.element.id);
		if (options.arrowsSelect) entry.activate();
	};

	// No `isHeld` guard: as in FF, a held arrow keeps walking and a held Space or Enter repeats.
	const handleKeyDown = (
		index: number,
		activate: () => void,
		event: KeyEvent,
	) => {
		switch (event.key) {
			case ' ':
			case 'Enter':
				event.preventDefault();
				activate();
				return;
			case 'ArrowDown':
				focusFrom(index, 1);
				return;
			case 'ArrowUp':
				focusFrom(index, -1);
				return;
			case 'ArrowRight':
				if (options.arrowsSelect) focusFrom(index, 1);
				return;
			case 'ArrowLeft':
				if (options.arrowsSelect) focusFrom(index, -1);
				return;
			case 'Home':
				focusFrom(index, 'first');
				return;
			case 'End':
				focusFrom(index, 'last');
				return;
		}
	};

	return { registerRow, focusFrom, handleKeyDown };
}

export type RowList = ReturnType<typeof createRowList>;
