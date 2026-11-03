import type { KeyEvent } from '@ghia/solid';
import { createUniqueId } from 'solid-js';

export interface SwitchRootOptions {
	checked: () => boolean;
	disabled: () => boolean | undefined;
	onCheckedChange: (checked: boolean) => void;
	/** The element that names the switch (`aria-labelledby`). */
	labelId: () => string;
}

/**
 * The switch's accessibility and keys. Base UI's root owns them: Enter
 * clicks on keydown, Space on keyup (a keydown only keeps the page from
 * scrolling).
 */
export function createSwitchRoot(options: SwitchRootOptions) {
	const id = createUniqueId();
	const toggle = () => options.onCheckedChange(!options.checked());

	const onKeyDown = (event: KeyEvent) => {
		if (options.disabled() === true) return;
		if (event.key === 'Enter') {
			event.preventDefault();
			toggle();
		} else if (event.key === ' ') {
			event.preventDefault();
		}
	};
	const onKeyUp = (event: KeyEvent) => {
		if (options.disabled() === true || event.key !== ' ') return;
		if (event.defaultPrevented) return;
		toggle();
	};

	return {
		checked: options.checked,
		toggle,
		rootProps: {
			id,
			role: 'switch' as const,
			get 'aria-checked'() {
				return options.checked();
			},
			get 'aria-labelledby'() {
				return options.labelId();
			},
			get 'aria-disabled'() {
				return options.disabled() === true;
			},
			get tabIndex() {
				return options.disabled() === true ? -1 : 0;
			},
			onKeyDown,
			onKeyUp,
		},
	};
}

export type SwitchRoot = ReturnType<typeof createSwitchRoot>;
