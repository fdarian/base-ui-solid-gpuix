import { createCollapsibleRoot } from '../../collapsible/root/use-collapsible-root';
import type { AccordionRoot } from '../root/use-accordion-root';

export interface AccordionItemOptions {
	value: () => string;
	disabled: () => boolean;
}

export type AccordionItem = ReturnType<typeof createAccordionItem>;

/** An item is a Collapsible whose open state is its value's presence in the accordion's value. */
export function createAccordionItem(
	root: AccordionRoot,
	options: AccordionItemOptions,
) {
	const collapsible = createCollapsibleRoot({
		open: () => root.isOpen(options.value()),
		onOpenChange: (nextOpen) =>
			root.handleValueChange(options.value(), nextOpen),
		disabled: options.disabled,
	});
	return {
		collapsible,
		value: options.value,
		open: collapsible.open,
		disabled: collapsible.disabled,
		triggerId: collapsible.triggerId,
		panelId: collapsible.panelId,
	};
}
