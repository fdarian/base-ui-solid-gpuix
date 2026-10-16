import {
	createEffect,
	createSignal,
	createUniqueId,
	onMount,
	untrack,
} from 'solid-js';
import { createPresence } from '../../internals';
import type { MenuRootConfig, MenuRootProps } from '../root/menu-root';

/** Open state of a submenu (`menu/submenu-root/MenuSubmenuRoot.tsx`, `menu/root/MenuRoot.tsx`). */
export function createMenuSubmenuRoot(
	props: Omit<MenuRootProps, 'disabled'>,
	config: MenuRootConfig,
) {
	const presence = createPresence(config.exitMs);
	const [entered, setEntered] = createSignal(false);
	const apply = (next: boolean) => {
		if (next === presence.open()) return;
		if (next) presence.show();
		else {
			presence.hide();
			setEntered(false);
		}
	};
	createEffect(() => {
		const controlled = props.open;
		if (controlled !== undefined) untrack(() => apply(controlled));
	});
	onMount(() => {
		if (props.defaultOpen === true) apply(true);
	});
	return {
		presence,
		open: presence.open,
		popupId: createUniqueId(),
		setOpen(next: boolean) {
			if (props.open === undefined) apply(next);
			props.onOpenChange?.(next);
		},
		/** Right / Enter went into the submenu, which may already be open from a hover: focus its first row. */
		entered,
		enter: () => setEntered(true),
	};
}

export type MenuSubmenuRoot = ReturnType<typeof createMenuSubmenuRoot>;
