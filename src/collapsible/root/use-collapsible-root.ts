import { createSignal, createUniqueId } from 'solid-js';

export interface CollapsibleRootOptions {
	/** Controlled open state. While it returns a boolean the root never holds the state itself. */
	open?: () => boolean | undefined;
	defaultOpen?: boolean;
	onOpenChange?: (open: boolean) => void;
	disabled?: () => boolean;
}

export type CollapsibleRoot = ReturnType<typeof createCollapsibleRoot>;

export function createCollapsibleRoot(options: CollapsibleRootOptions) {
	const [internalOpen, setInternalOpen] = createSignal(
		options.defaultOpen ?? false,
	);
	const open = () => options.open?.() ?? internalOpen();
	const disabled = () => options.disabled?.() ?? false;

	const setOpen = (next: boolean) => {
		if (options.open?.() === undefined) setInternalOpen(next);
		options.onOpenChange?.(next);
	};

	return {
		open,
		disabled,
		setOpen,
		/** Base UI's `handleTrigger`. */
		toggle() {
			if (disabled()) return;
			setOpen(!open());
		},
		triggerId: createUniqueId(),
		panelId: createUniqueId(),
	};
}
