import { describe, expect, test } from 'bun:test';
import { createAccordionItem } from '../item/use-accordion-item';
import { createAccordionRoot } from './use-accordion-root';

describe('createAccordionRoot', () => {
	test('single: opening another item closes the open one, pressing it again closes it', () => {
		const changes: string[][] = [];
		const root = createAccordionRoot({
			defaultValue: ['a'],
			onValueChange: (value) => changes.push(value),
		});
		root.handleValueChange('b', true);
		expect(root.value()).toEqual(['b']);
		root.handleValueChange('b', false);
		expect(root.value()).toEqual([]);
		expect(changes).toEqual([['b'], []]);
	});

	test('multiple: appends on open and filters on close', () => {
		const root = createAccordionRoot({
			defaultValue: ['a'],
			multiple: () => true,
		});
		root.handleValueChange('b', true);
		expect(root.value()).toEqual(['a', 'b']);
		root.handleValueChange('a', false);
		expect(root.value()).toEqual(['b']);
	});

	test('controlled: reports the change and keeps the owner value', () => {
		const changes: string[][] = [];
		const root = createAccordionRoot({
			value: () => ['a'],
			onValueChange: (value) => changes.push(value),
		});
		root.handleValueChange('b', true);
		expect(root.value()).toEqual(['a']);
		expect(changes).toEqual([['b']]);
	});

	test('an item toggles its own value and ignores a press while disabled', () => {
		const root = createAccordionRoot({});
		const item = createAccordionItem(root, {
			value: () => 'a',
			disabled: () => false,
		});
		item.collapsible.toggle();
		expect(item.open()).toBe(true);
		const locked = createAccordionItem(root, {
			value: () => 'b',
			disabled: () => true,
		});
		locked.collapsible.toggle();
		expect(root.value()).toEqual(['a']);
	});
});
