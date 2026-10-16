import { createPresence } from '../../internals';

export interface UseDrawerRootOptions {
	/** The parent owns this: a drawer only reports closes. */
	open: () => boolean;
	onClose: () => void;
	/** The panel's exit tween plus a buffer: the timer that takes the layer down when the exit never reports its end. */
	exitMs: number;
}

/**
 * Exit hold and close reporting for a drawer over gpuix's headless `Dialog`
 * (upstream's drawer is a Dialog too). Pass `mounted()` to gpuix's `Dialog` as
 * `open` and `onOpenChange` as its `onOpenChange`; call `finish` when the exit
 * tween ends.
 */
export function createDrawerRoot(options: UseDrawerRootOptions) {
	// onMotionComplete is the primary release; the timer covers an exit that never animates.
	const presence = createPresence(options.exitMs, options.open());
	presence.follow(options.open);
	return {
		mounted: presence.mounted,
		finish: presence.release,
		onOpenChange(next: boolean) {
			// gpuix keeps the layer up through the exit, so Escape still arrives then; the drawer has already been told.
			if (!next && options.open()) options.onClose();
		},
	};
}
