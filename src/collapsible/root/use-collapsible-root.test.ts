import { describe, expect, test } from 'bun:test';
import { createCollapsibleRoot } from './use-collapsible-root';

describe('createCollapsibleRoot', () => {
	test('uncontrolled: starts at defaultOpen and toggles', () => {
		const changes: boolean[] = [];
		const root = createCollapsibleRoot({
			defaultOpen: true,
			onOpenChange: (open) => changes.push(open),
		});
		expect(root.open()).toBe(true);
		root.toggle();
		expect(root.open()).toBe(false);
		root.toggle();
		expect(root.open()).toBe(true);
		expect(changes).toEqual([false, true]);
	});

	test('controlled: reports the change and leaves the state to the owner', () => {
		const changes: boolean[] = [];
		const root = createCollapsibleRoot({
			open: () => false,
			defaultOpen: true,
			onOpenChange: (open) => changes.push(open),
		});
		expect(root.open()).toBe(false);
		root.toggle();
		expect(root.open()).toBe(false);
		expect(changes).toEqual([true]);
	});

	test('disabled: toggle does nothing', () => {
		const changes: boolean[] = [];
		const root = createCollapsibleRoot({
			disabled: () => true,
			onOpenChange: (open) => changes.push(open),
		});
		root.toggle();
		expect(root.open()).toBe(false);
		expect(changes).toEqual([]);
	});
});
