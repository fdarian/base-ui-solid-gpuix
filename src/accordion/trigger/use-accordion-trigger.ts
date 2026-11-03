import type { KeyEvent } from '@ghia/solid';
import { mergeProps } from 'solid-js';
import {
	type CollapsibleTriggerAria,
	createCollapsibleTrigger,
} from '../../collapsible/trigger/use-collapsible-trigger';
import type { AccordionItem } from '../item/use-accordion-item';

export interface AccordionTriggerOptions {
	/** Runs before the trigger's own Enter / Space handling. */
	onKeyDown?: (event: KeyEvent) => void;
}

export interface AccordionTriggerAria extends CollapsibleTriggerAria {
	'aria-disabled': boolean;
}

/** Spread `props` on the trigger element. */
export function createAccordionTrigger(
	item: AccordionItem,
	options: AccordionTriggerOptions = {},
) {
	const trigger = createCollapsibleTrigger(item.collapsible, options);
	return {
		props: mergeProps(trigger.props, {
			get 'aria-disabled'() {
				return item.disabled();
			},
		}) as Record<string, unknown> & AccordionTriggerAria,
	};
}
