import { createSignal, createUniqueId } from 'solid-js';

export interface TabsRootOptions<Value extends string | number> {
	/** Controlled value; takes precedence over `defaultValue`. */
	value?: () => Value | undefined;
	defaultValue?: Value;
	onValueChange?: (value: Value) => void;
	/** Replaces the generated tab id; `undefined` leaves the tab without one. */
	tabId?: (value: Value) => string | undefined;
	/** Replaces the generated panel id; `undefined` leaves the panel without one. */
	panelId?: (value: Value) => string | undefined;
}

export type TabsRoot<Value extends string | number = string> = ReturnType<
	typeof createTabsRoot<Value>
>;

export function createTabsRoot<Value extends string | number>(
	options: TabsRootOptions<Value>,
) {
	const [uncontrolled, setUncontrolled] = createSignal<Value | undefined>(
		options.defaultValue,
	);
	const [order, setOrder] = createSignal<readonly Value[]>([]);
	const [panels, setPanels] = createSignal<readonly Value[]>([]);
	const idPrefix = createUniqueId();
	// Uncontrolled with no defaultValue falls back to the first tab.
	const selected = () => options.value?.() ?? uncontrolled() ?? order()[0];

	return {
		selected,
		isSelected: (value: Value) => selected() === value,
		select(value: Value) {
			// Base UI never re-commits the active tab.
			if (selected() === value) return;
			if (options.value?.() === undefined) setUncontrolled(() => value);
			options.onValueChange?.(value);
		},
		/** Tab values in document order, reported by the tabs as they mount. */
		order,
		reportValue(index: number, value: Value) {
			const next = [...order()];
			next[index] = value;
			setOrder(next);
		},
		/** The selected tab's position in `order`, or -1. */
		selectedIndex() {
			const value = selected();
			if (value === undefined) return -1;
			return order().indexOf(value);
		},
		tabId(value: Value) {
			if (options.tabId !== undefined) return options.tabId(value);
			return `${idPrefix}-tab-${encodeURIComponent(value)}`;
		},
		panelId(value: Value) {
			if (options.panelId !== undefined) return options.panelId(value);
			return `${idPrefix}-panel-${encodeURIComponent(value)}`;
		},
		/** Panels mount only while selected, so only a mounted one can be a tab's `aria-controls`. */
		hasPanel: (value: Value) => panels().includes(value),
		registerPanel: (value: Value) =>
			setPanels((current) => [...current, value]),
		unregisterPanel: (value: Value) =>
			setPanels((current) => current.filter((entry) => entry !== value)),
	};
}
