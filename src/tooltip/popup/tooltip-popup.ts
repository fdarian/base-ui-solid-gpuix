import type { TooltipTrigger } from '../trigger/tooltip-trigger';

/** The popup is hoverable, like Base UI's: reaching it keeps the tooltip open (`tooltip/popup/TooltipPopup.tsx`, `disableHoverablePopup` false). */
export function createTooltipPopup(trigger: TooltipTrigger) {
	return {
		/** A function, not a prop: a spread `ref` applies late in gpuix JSX. */
		ref: trigger.setPopupElement,
		props: {
			onMouseEnter: trigger.enterPopup,
			onMouseLeave: trigger.leavePopup,
		},
	};
}
