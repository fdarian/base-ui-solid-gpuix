import { buttonProps, type KeyEvent, useGpuixRequired } from '@gpuix/solid';
import { mergeProps } from 'solid-js';
import type { CollapsibleRoot } from '../root/use-collapsible-root';

export interface CollapsibleTriggerAria {
	id: string;
	'aria-expanded': boolean;
	'aria-controls': string | undefined;
}

export interface CollapsibleTriggerOptions {
	/** Runs before the trigger's own Enter / Space handling. */
	onKeyDown?: (event: KeyEvent) => void;
}

/**
 * Spread `props` on the trigger element: the button behaviour (tab stop,
 * Enter on key down, Space on key up) and `aria-expanded` / `aria-controls`.
 */
export function createCollapsibleTrigger(
	root: CollapsibleRoot,
	options: CollapsibleTriggerOptions = {},
) {
	const renderer = useGpuixRequired();
	return {
		// mergeProps keeps buttonProps' lazy getters; its type collapses to `unknown` against the index signature.
		props: mergeProps(
			buttonProps(
				{
					get disabled() {
						return root.disabled();
					},
					onClick() {
						root.toggle();
					},
					onKeyDown: options.onKeyDown,
					tabIndex: 0,
				},
				renderer,
			),
			{
				id: root.triggerId,
				get 'aria-expanded'() {
					return root.open();
				},
				get 'aria-controls'() {
					return root.open() ? root.panelId : undefined;
				},
			},
		) as Record<string, unknown> & CollapsibleTriggerAria,
	};
}
