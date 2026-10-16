import { createEffect, createSignal, on } from 'solid-js';
import { createCompositeRoot } from '../../internals/composite';

export interface TabsListOptions {
	/** The selected tab's index, or -1 when none is selected. */
	selectedIndex: () => number;
	/** Focusing an enabled tab selects it. Without it Enter / Space select (manual activation). */
	activateOnFocus: boolean;
}

export type TabsList = ReturnType<typeof createTabsList>;

export function createTabsList(options: TabsListOptions) {
	// Tabs stay focusable when disabled, so the arrow keys never skip one.
	const composite = createCompositeRoot({ orientation: 'horizontal' });
	let counter = 0;
	/** The last-focused tab keeps the tab stop (a focused disabled tab, say); a new selection takes it back. */
	const [focusedTab, setFocusedTab] = createSignal<number>();
	createEffect(
		on(options.selectedIndex, () => setFocusedTab(undefined), { defer: true }),
	);

	return {
		composite,
		activateOnFocus: options.activateOnFocus,
		selectedIndex: options.selectedIndex,
		/** Mount-order index for a tab that has none of its own. */
		nextIndex: () => counter++,
		/** The tab that holds the roving tab stop. */
		tabStop: () => focusedTab() ?? Math.max(options.selectedIndex(), 0),
		focusTab: setFocusedTab,
		props: { role: 'tablist' },
	};
}
