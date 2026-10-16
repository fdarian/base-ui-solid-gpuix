import { createSignal } from 'solid-js';

export interface AccordionRootOptions {
	/** Controlled values of the open items. While it returns an array the root never holds the value itself. */
	value?: () => readonly string[] | undefined;
	defaultValue?: readonly string[];
	/** Called with the open items' values after each change. */
	onValueChange?: (value: string[]) => void;
	/** One open item at a time unless set. */
	multiple?: () => boolean;
}

export type AccordionRoot = ReturnType<typeof createAccordionRoot>;

export function createAccordionRoot(options: AccordionRootOptions) {
	const [internal, setInternal] = createSignal<readonly string[]>(
		options.defaultValue ?? [],
	);
	const value = () => options.value?.() ?? internal();

	return {
		value,
		isOpen: (itemValue: string) => value().includes(itemValue),
		handleValueChange(itemValue: string, nextOpen: boolean) {
			const current = value();
			let next: string[];
			if (options.multiple?.() !== true) {
				next = current[0] === itemValue ? [] : [itemValue];
			} else if (nextOpen) {
				next = [...current, itemValue];
			} else {
				next = current.filter((entry) => entry !== itemValue);
			}
			if (options.value?.() === undefined) setInternal(next);
			options.onValueChange?.(next);
		},
	};
}
