import { createEffect, createSignal, on } from 'solid-js';
import { createCollapsiblePanel } from '../../collapsible/panel/use-collapsible-panel';
import type { AccordionItem } from '../item/use-accordion-item';

export type AccordionPanel = ReturnType<typeof createAccordionPanel>;

export interface AccordionPanelOptions {
	/** Keep the panel rendered while hidden (Base UI's `keepMounted`). */
	keepMounted?: boolean;
}

/**
 * Base UI 1.9's `hidden = !open && !mounted` and `shouldRender = keepMounted || mounted || open`,
 * with `hiddenUntilFound` and the Root-level `keepMounted` not ported.
 */
export function createAccordionPanel(
	item: AccordionItem,
	options?: AccordionPanelOptions,
) {
	const panel = createCollapsiblePanel(item.collapsible);
	const [exited, setExited] = createSignal(!item.open());
	createEffect(
		on(
			item.open,
			(open) => {
				if (open) setExited(false);
			},
			{ defer: true },
		),
	);
	const hidden = () => !item.open() && exited();

	return {
		props: {
			id: panel.id,
			role: 'region' as const,
			'aria-labelledby': item.triggerId,
		},
		/** Closed and past its exit. The consumer applies it as `display: none` (`@ghia/native` has no `hidden` attribute). */
		hidden,
		/** Whether the panel element is in the tree: always with `keepMounted`, else until it is hidden. */
		rendered: () => options?.keepMounted === true || !hidden(),
		/** The consumer calls this when the close animation ends; ignored while the item is open. */
		onExitComplete() {
			if (!item.open()) setExited(true);
		},
	};
}
