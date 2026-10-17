import { describe, expect, test } from 'bun:test';
import type { KeyEvent } from '@gpuix/solid';
import { createRoot, createSignal } from 'solid-js';
import { MENU_TYPEAHEAD_RESET_MS } from '../../floating-ui-solid/hooks';
import { createMenuList } from './menu-list';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function setup(labels: string[]) {
	return createRoot((dispose) => {
		const [highlighted, setHighlighted] = createSignal<number | null>(null);
		const list = createMenuList({
			open: () => true,
			mounted: () => true,
			closeAll: () => {},
			closeSelf: () => {},
			isSub: false,
			multiple: () => false,
			keyboardActive: () => true,
			setKeyboardActive: () => {},
			leave: () => {},
			openFrom: () => 'first',
			pressPick: () => false,
			releasePress: () => {},
			highlightedIndex: highlighted,
			onHighlightChange: (index) => setHighlighted(index),
			rowRect: () => undefined,
			revealPadding: 0,
			searchHeight: 0,
			pointer: {
				onMouseEnter: () => {},
				onMouseMove: () => {},
				onMouseLeave: () => {},
			},
			openFocusMs: null,
		});
		labels.forEach((label, index) => {
			list.itemHost.rows.set(index, {
				label,
				disabled: () => false,
				activate: () => {},
				focus: () => {},
				element: () => undefined,
			});
		});
		const onKeyDown = list.popupProps({
			id: 'menu',
			labelledBy: 'trigger',
		}).onKeyDown;
		const type = (key: string) =>
			onKeyDown({
				key,
				ctrlKey: false,
				altKey: false,
				metaKey: false,
				shiftKey: false,
				target: undefined,
				stopPropagation: () => {},
				preventDefault: () => {},
			} as unknown as KeyEvent);
		return { highlighted, type, dispose };
	});
}

describe('createMenuList typeahead', () => {
	test("forgets the query after Base UI's 500 ms", async () => {
		expect(MENU_TYPEAHEAD_RESET_MS).toBe(500);
		const menu = setup(['Alpha', 'Charlie', 'Charter']);
		menu.type('c');
		menu.type('h');
		menu.type('a');
		menu.type('r');
		menu.type('t');
		expect(menu.highlighted()).toBe(2);
		await sleep(MENU_TYPEAHEAD_RESET_MS + 100);
		// A 750 ms window would still hold "chart" and fail to match "chartc", leaving the row.
		menu.type('c');
		expect(menu.highlighted()).toBe(1);
		menu.dispose();
	});

	test('keeps the query inside the window', async () => {
		const menu = setup(['Alpha', 'Charlie', 'Charter']);
		menu.type('c');
		await sleep(MENU_TYPEAHEAD_RESET_MS - 200);
		menu.type('h');
		expect(menu.highlighted()).toBe(1);
		await sleep(MENU_TYPEAHEAD_RESET_MS - 200);
		menu.type('a');
		menu.type('r');
		menu.type('t');
		expect(menu.highlighted()).toBe(2);
		menu.dispose();
	});
});
