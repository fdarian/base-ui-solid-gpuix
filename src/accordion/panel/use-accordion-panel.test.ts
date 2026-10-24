import { describe, expect, test } from 'bun:test';
import { createRoot } from 'solid-js';
import { createAccordionItem } from '../item/use-accordion-item';
import { createAccordionRoot } from '../root/use-accordion-root';
import { createAccordionPanel } from './use-accordion-panel';

// The reset-on-open effect only starts tracking once its root has returned, so each test builds inside the root and acts outside it.
function setup(defaultValue: string[], keepMounted?: boolean) {
	return createRoot((dispose) => {
		const root = createAccordionRoot({ defaultValue });
		const item = createAccordionItem(root, {
			value: () => 'a',
			disabled: () => false,
		});
		const panel = createAccordionPanel(item, { keepMounted });
		return { item, panel, dispose };
	});
}

describe('createAccordionPanel', () => {
	test('initially closed: hidden', () => {
		const { panel, dispose } = setup([]);
		expect(panel.hidden()).toBe(true);
		dispose();
	});

	test('initially open: not hidden', () => {
		const { panel, dispose } = setup(['a']);
		expect(panel.hidden()).toBe(false);
		dispose();
	});

	test('opening shows it; closing keeps it until onExitComplete', () => {
		const { item, panel, dispose } = setup([]);
		item.collapsible.toggle();
		expect(panel.hidden()).toBe(false);
		item.collapsible.toggle();
		expect(panel.hidden()).toBe(false);
		panel.onExitComplete();
		expect(panel.hidden()).toBe(true);
		dispose();
	});

	test('onExitComplete while open does nothing', () => {
		const { item, panel, dispose } = setup(['a']);
		panel.onExitComplete();
		expect(panel.hidden()).toBe(false);
		item.collapsible.toggle();
		expect(panel.hidden()).toBe(false);
		dispose();
	});

	test('reopening after the exit shows it again', () => {
		const { item, panel, dispose } = setup(['a']);
		item.collapsible.toggle();
		panel.onExitComplete();
		expect(panel.hidden()).toBe(true);
		item.collapsible.toggle();
		expect(panel.hidden()).toBe(false);
		dispose();
	});

	test('rendered: false after the exit, true with keepMounted', () => {
		for (const keepMounted of [false, true]) {
			const { item, panel, dispose } = setup(['a'], keepMounted);
			expect(panel.rendered()).toBe(true);
			item.collapsible.toggle();
			expect(panel.rendered()).toBe(true);
			panel.onExitComplete();
			expect(panel.hidden()).toBe(true);
			expect(panel.rendered()).toBe(keepMounted);
			dispose();
		}
	});
});
