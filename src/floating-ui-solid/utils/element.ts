/** The part of an element the safe polygon reads: its box in window coordinates. `HostElement` has it. */
export interface BoxElement {
	getBoundingClientRect(): {
		x: number;
		y: number;
		width: number;
		height: number;
	};
}

/**
 * Whether `child` is `parent` or sits below it. The tree is gpuix's, where
 * every element knows its `parent`; a popup anchored to a trigger is the
 * trigger's descendant, which the DOM version's portalled popup is not.
 */
export function contains(
	parent: object | null | undefined,
	child: object | null | undefined,
) {
	let node: object | null | undefined = child;
	while (node !== null && node !== undefined) {
		if (node === parent) return true;
		node = (node as { parent?: object | null }).parent;
	}
	return false;
}
