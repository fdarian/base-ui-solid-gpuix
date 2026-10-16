import type { TooltipTrigger } from '../trigger/tooltip-trigger';

/** The popup is hoverable, like Base UI's: reaching it keeps the tooltip open (`tooltip/popup/TooltipPopup.tsx`, `disableHoverablePopup` false). */
export function createTooltipPopup(trigger: TooltipTrigger) {
	return {
		props: {
			onMouseEnter: trigger.enterPopup,
			onMouseLeave: trigger.leavePopup,
		},
	};
}
