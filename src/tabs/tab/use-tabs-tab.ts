import {
	buttonProps,
	type HostElement,
	type KeyEvent,
	useGpuixRequired,
} from '@gpuix/solid';
import { mergeProps } from 'solid-js';
import type { TabsList } from '../list/use-tabs-list';
import type { TabsRoot } from '../root/use-tabs-root';

export interface TabsTabOptions<Value extends string | number> {
	value: () => Value;
	/**
	 * Whether the tab is disabled; a tab that can be disabled reports
	 * `aria-disabled`. Disabled tabs stay focusable (arrows land on them) and
	 * never activate by click, focus, Enter or Space.
	 */
	disabled?: () => boolean | undefined;
	/** The tab's position in the list. Without it the tab takes the next mount-order index and reports its value to the root. */
	index?: () => number;
	/** Runs on a click with the tab's index, before the tab is selected. */
	onClick?: (index: number) => void;
	/** Whether a panel is mounted for this tab, for `aria-controls`. Defaults to the root's registered panels. */
	controlsPanel?: () => boolean;
}

export interface TabsTabAria {
	role: 'tab';
	id: string | undefined;
	'aria-selected': boolean;
	'aria-controls': string | undefined;
	'aria-disabled': boolean | undefined;
}

export function createTabsTab<Value extends string | number>(
	root: TabsRoot<Value>,
	list: TabsList,
	options: TabsTabOptions<Value>,
) {
	const renderer = useGpuixRequired();
	let index = options.index;
	if (index === undefined) {
		const own = list.nextIndex();
		root.reportValue(own, options.value());
		index = () => own;
	}
	const tabIndex = index;
	const isSelected = () => root.isSelected(options.value());
	const isDisabled = () => options.disabled?.() === true;
	const controlsPanel =
		options.controlsPanel ?? (() => root.hasPanel(options.value()));

	return {
		index: tabIndex,
		isSelected,
		/** Takes the tab into the list's arrow-key order; call once the element has mounted. */
		register(element: HostElement) {
			list.composite.register(tabIndex(), element);
		},
		/** The focus handler's share: the tab takes the tab stop, and selects when the list activates on focus. */
		onFocus() {
			list.focusTab(tabIndex());
			if (list.activateOnFocus && !isDisabled()) root.select(options.value());
		},
		props: mergeProps(
			buttonProps(
				{
					get disabled() {
						return options.disabled?.();
					},
					// Base UI tabs stay focusable when disabled: arrows land on them, nothing activates.
					focusableWhenDisabled: true,
					onClick() {
						options.onClick?.(tabIndex());
						root.select(options.value());
					},
					onKeyDown(event: KeyEvent) {
						list.composite.onKeyDown(tabIndex(), event);
					},
					get tabIndex() {
						return list.tabStop() === tabIndex() ? 0 : -1;
					},
				},
				renderer,
			),
			{
				role: 'tab',
				get id() {
					return root.tabId(options.value());
				},
				get 'aria-selected'() {
					return isSelected();
				},
				get 'aria-controls'() {
					return controlsPanel() ? root.panelId(options.value()) : undefined;
				},
				get 'aria-disabled'() {
					return options.disabled === undefined ? undefined : isDisabled();
				},
			},
		) as Record<string, unknown> & TabsTabAria,
	};
}
