import { createEffect, createSignal, untrack } from 'solid-js';
import { createPresence } from '../../internals';
import type { TooltipGroup } from '../provider/tooltip-provider';

export interface TooltipRootProps {
	/** Overrides the group's delay for this tooltip, in ms. */
	delayDuration?: number;
	/** Pins the tooltip open or closed over the hover and focus state, which still tracks and reports. */
	open?: boolean;
	/** The hover or focus state changed (not a pin). */
	onOpenChange?: (open: boolean) => void;
}

export interface TooltipRootConfig {
	group: TooltipGroup;
	/** How long the popup stays mounted after it closes, for its exit. */
	exitMs: number;
}

/** Open state, delay and unmount timing of one tooltip (`tooltip/root/TooltipRoot.tsx`). */
export function createTooltipRoot(
	props: TooltipRootProps,
	config: TooltipRootConfig,
) {
	const group = config.group;
	// onMotionComplete is the primary release; the timer covers an exit that never animates.
	const presence = createPresence(config.exitMs);
	const [opened, setHovered] = createSignal(false);
	const open = () => props.open ?? opened();

	createEffect(() => {
		if (open()) presence.show();
		else if (untrack(presence.mounted)) presence.hide();
	});

	return {
		group,
		presence,
		/** The hover or focus state, apart from any pin. */
		opened,
		open,
		setOpen(next: boolean) {
			if (opened() === next) return;
			setHovered(next);
			props.onOpenChange?.(next);
		},
		/** How long a pointer must rest before opening: none right after a neighbour closed, else the tooltip's own or the group's. */
		delay() {
			const closedAt = group.closedAt;
			if (
				closedAt !== undefined &&
				performance.now() - closedAt < group.skipDelay
			)
				return 0;
			return props.delayDuration ?? group.delay;
		},
	};
}

export type TooltipRoot = ReturnType<typeof createTooltipRoot>;
