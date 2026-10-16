import { createEffect, createSignal, on } from 'solid-js';
import { createCollapsiblePanel } from '../../collapsible/panel/use-collapsible-panel';
import type { AccordionItem } from '../item/use-accordion-item';

export type AccordionPanel = ReturnType<typeof createAccordionPanel>;

export function createAccordionPanel(item: AccordionItem) {
	const panel = createCollapsiblePanel(item.collapsible);
	// gpuix has no `display: none`, so a closed panel's text leaves the accessibility tree by unmounting once the exit is over (Base UI hides the panel). It paints once first, or it would never report its height.
	const [retired, setRetired] = createSignal(false);
	let toggled = false;
	createEffect(
		on(
			item.open,
			(open) => {
				toggled = true;
				if (open) setRetired(false);
			},
			{ defer: true },
		),
	);

	return {
		props: {
			id: panel.id,
			role: 'region' as const,
			'aria-labelledby': item.triggerId,
		},
		/** The panel's content is unmounted: its exit is over. */
		retired,
		/** The panel's height tween ended. */
		onExitComplete() {
			if (!item.open()) setRetired(true);
		},
		/** The panel's content reported its size (it is painted). */
		onContentLayout() {
			if (!toggled && !item.open()) setRetired(true);
		},
	};
}
