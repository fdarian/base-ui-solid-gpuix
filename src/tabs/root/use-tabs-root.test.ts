import { describe, expect, test } from 'bun:test';
import { createTabsRoot } from './use-tabs-root';

describe('createTabsRoot', () => {
	test('uncontrolled without a default falls back to the first reported tab', () => {
		const root = createTabsRoot<string>({});
		expect(root.selected()).toBeUndefined();
		root.reportValue(0, 'a');
		root.reportValue(1, 'b');
		expect(root.selected()).toBe('a');
		expect(root.selectedIndex()).toBe(0);
	});

	test('select commits once and never re-commits the active tab', () => {
		const changes: string[] = [];
		const root = createTabsRoot<string>({
			defaultValue: 'a',
			onValueChange: (value) => changes.push(value),
		});
		root.select('a');
		root.select('b');
		root.select('b');
		expect(root.selected()).toBe('b');
		expect(changes).toEqual(['b']);
	});

	test('controlled: reports the change and keeps the owner value', () => {
		const changes: number[] = [];
		const root = createTabsRoot<number>({
			value: () => 1,
			onValueChange: (value) => changes.push(value),
		});
		root.select(2);
		expect(root.selected()).toBe(1);
		expect(changes).toEqual([2]);
	});

	test('ids come from the root unless replaced; panels register', () => {
		const root = createTabsRoot<string>({});
		expect(root.tabId('a b')).toContain('-tab-a%20b');
		expect(root.hasPanel('a')).toBe(false);
		root.registerPanel('a');
		expect(root.hasPanel('a')).toBe(true);
		root.unregisterPanel('a');
		expect(root.hasPanel('a')).toBe(false);
		const custom = createTabsRoot<number>({
			tabId: (index) => `t${index}`,
			panelId: () => undefined,
		});
		expect(custom.tabId(2)).toBe('t2');
		expect(custom.panelId(2)).toBeUndefined();
	});
});
