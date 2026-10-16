import type { CollapsibleRoot } from '../root/use-collapsible-root';

/**
 * `id` goes on the panel (the trigger's `aria-controls` names it while the
 * panel is open). Base UI hides a closed panel, and gpuix has no
 * `display: none` here: `inert` on the panel's content takes its triggers out
 * of the tab order and its text out of the accessibility tree.
 */
export function createCollapsiblePanel(root: CollapsibleRoot) {
	return {
		id: root.panelId,
		inert: () => !root.open(),
	};
}
