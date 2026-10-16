import { onCleanup } from 'solid-js';
import type { TabsRoot } from '../root/use-tabs-root';

/** Call inside the panel's content, which exists only while its tab is selected: it registers with the root until it unmounts. */
export function createTabsPanel<Value extends string | number>(
	root: TabsRoot<Value>,
	options: { value: () => Value },
) {
	root.registerPanel(options.value());
	onCleanup(() => root.unregisterPanel(options.value()));
	return {
		props: {
			role: 'tabpanel' as const,
			get id() {
				return root.panelId(options.value());
			},
			get 'aria-labelledby'() {
				return root.tabId(options.value());
			},
			// A tab stop, like Base UI's panel.
			tabIndex: 0,
		},
	};
}
