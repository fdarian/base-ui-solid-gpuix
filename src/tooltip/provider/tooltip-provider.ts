import { createContext, useContext } from 'solid-js';

/** What tooltips under one provider share: the hover delay, and when the last one closed so a neighbour can skip it. */
export interface TooltipGroup {
	readonly delay: number;
	readonly skipDelay: number;
	closedAt: number | undefined;
}

export interface TooltipProviderOptions {
	/** How long to rest on a trigger before its tooltip opens, in ms. Base UI's `delay`. */
	delay: () => number;
	/** Another tooltip opens at once if the previous one closed within this many ms. Base UI's `timeout`. */
	skipDelay: () => number;
}

/**
 * Moving from one trigger to the next within `skipDelay` of a close opens the
 * next tooltip at once (`tooltip/provider/TooltipProvider.tsx`, built on
 * `floating-ui-react`'s `FloatingDelayGroup`). The delays are read when a
 * tooltip needs them, so they may change.
 */
export function createTooltipProvider(
	options: TooltipProviderOptions,
): TooltipGroup {
	return {
		get delay() {
			return options.delay();
		},
		get skipDelay() {
			return options.skipDelay();
		},
		closedAt: undefined,
	};
}

export const TooltipProviderContext = createContext<TooltipGroup>();

/** The enclosing provider's group, or `undefined` for a tooltip on its own. */
export function useTooltipProvider() {
	return useContext(TooltipProviderContext);
}
