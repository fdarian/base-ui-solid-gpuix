import { createSignal } from 'solid-js';

/**
 * A search field inside the menu. Base UI has no such part for a plain
 * `Menu`: its `Menu.Input` is the virtual-focus filter, so this is the
 * field-as-a-stop model FF layers on top (`dropdown-search.tsx`).
 */
export interface MenuSearchProps {
	/** The query. Filter the rows you render against it. */
	value: string;
	onValueChange: (value: string) => void;
	/** Reset the query when the popup closes, so the menu reopens unfiltered. Defaults to `true`. */
	clearOnClose?: boolean;
	/** Take focus when the popup opens. Defaults to `true`. */
	autoFocus?: boolean;
}

export interface MenuSearchHost<Search extends MenuSearchProps> {
	register: (props: Search) => () => void;
}

/** The field registers its props with the list, which draws it ahead of the rows. */
export function createMenuSearch<Search extends MenuSearchProps>() {
	const [search, setSearch] = createSignal<Search>();
	let lastSearch: Search | undefined;
	const host: MenuSearchHost<Search> = {
		register(props) {
			setSearch(() => props);
			lastSearch = props;
			return () => {
				if (search() === props) setSearch(undefined);
			};
		},
	};
	return {
		search,
		host,
		/** The props the field last registered, once, for a clear that happens after the field is gone. */
		takeLast() {
			const last = lastSearch;
			lastSearch = undefined;
			return last;
		},
	};
}
