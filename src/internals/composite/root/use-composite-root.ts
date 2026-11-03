import { type HostElement, type KeyEvent, useGpuixRequired } from '@ghia/solid';

// Stands in for Base UI's `internals/composite/root/useCompositeRoot.ts`: the
// key handling Tabs and Accordion (an FF extra) share. Radio and checkbox
// groups use `row-list.ts` instead, whose behaviour differs.

export type CompositeStep = 'next' | 'previous' | 'first' | 'last';

const stepKeys = {
	horizontal: {
		ArrowRight: 'next',
		ArrowLeft: 'previous',
		Home: 'first',
		End: 'last',
	},
	vertical: {
		ArrowDown: 'next',
		ArrowUp: 'previous',
		Home: 'first',
		End: 'last',
	},
} as const satisfies Record<string, Record<string, CompositeStep>>;

export interface CompositeRootOptions {
	orientation: keyof typeof stepKeys;
	/** A step key whose target is the focused item is still consumed (no `preventDefault` or `stopPropagation` otherwise). */
	consumeSelfTarget?: boolean;
}

export type CompositeRoot = ReturnType<typeof createCompositeRoot>;

/**
 * Roving focus over a list of items: arrow keys (by `orientation`), Home and
 * End move focus to the next registered item, wrapping at either end. The
 * items are the registered elements in registration order. The tab stop is
 * the caller's: it sets `tabIndex` on the items itself.
 */
export function createCompositeRoot(options: CompositeRootOptions) {
	const renderer = useGpuixRequired();
	const items = new Map<
		number,
		{ element: HostElement; disabled: (() => boolean) | undefined }
	>();

	const targetOf = (index: number, step: CompositeStep) => {
		const order = [...items.keys()].filter(
			(key) => items.get(key)?.disabled?.() !== true,
		);
		const position = order.indexOf(index);
		return {
			next: order[(position + 1) % order.length],
			previous: order[(position - 1 + order.length) % order.length],
			first: order[0],
			last: order[order.length - 1],
		}[step];
	};

	const focus = (index: number) => {
		const item = items.get(index);
		if (item === undefined) return;
		renderer.focusElement?.(item.element.id);
	};

	return {
		/**
		 * Returns the function that takes the item out again. An item whose
		 * `disabled` is true is skipped by the arrow keys (a tab that stays
		 * focusable when disabled passes none).
		 */
		register(
			index: number,
			element: HostElement,
			item?: { disabled?: () => boolean },
		) {
			items.set(index, { element, disabled: item?.disabled });
			return () => {
				items.delete(index);
			};
		},
		/** Whether `target` (a focus event's `relatedTarget`, say) is one of the items. */
		isItem(target: unknown) {
			for (const item of items.values()) {
				if (item.element === target) return true;
			}
			return false;
		},
		focus,
		/** The `onKeyDown` of the item at `index`. */
		onKeyDown(index: number, event: KeyEvent) {
			if (event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) {
				return;
			}
			const keys: Record<string, CompositeStep | undefined> =
				stepKeys[options.orientation];
			const step = event.key === undefined ? undefined : keys[event.key];
			if (step === undefined) return;
			const target = targetOf(index, step);
			if (
				options.consumeSelfTarget !== true &&
				(target === undefined || target === index)
			) {
				return;
			}
			event.preventDefault();
			event.stopPropagation();
			// Focus moves; what the newly focused item does with it is its own business.
			if (target !== undefined) focus(target);
		},
	};
}
