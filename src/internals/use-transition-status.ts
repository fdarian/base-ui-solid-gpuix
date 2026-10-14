import { createEffect, createSignal, on, onCleanup } from "solid-js";

/** How long a popup keeps painting its exit fade before unmounting. */
const POPUP_EXIT_MS = 60;

/**
 * The unmount timer for popups whose exit `onMotionComplete` releases them:
 * the exit tween plus a buffer, like FF's `exitFallbackMs`.
 */
export const POPUP_EXIT_FALLBACK_MS = POPUP_EXIT_MS + 100;

/**
 * `open` drives the animation; `mounted` outlives it by `exitMs`, so the exit
 * can play. The exit's own completion (`onMotionComplete`) can unmount sooner
 * with `release()`; the timer covers an exit that never animates.
 */
export function createPresence(exitMs = POPUP_EXIT_MS, initiallyOpen = false) {
	const [open, setOpen] = createSignal(initiallyOpen);
	const [mounted, setMounted] = createSignal(initiallyOpen);
	let exitTimer: ReturnType<typeof setTimeout> | undefined;
	onCleanup(() => clearTimeout(exitTimer));

	const show = () => {
		clearTimeout(exitTimer);
		setOpen(true);
		setMounted(true);
	};
	const hide = () => {
		setOpen(false);
		clearTimeout(exitTimer);
		exitTimer = setTimeout(() => setMounted(false), exitMs);
	};
	return {
		open,
		mounted,
		show,
		hide,
		/** Unmount now: the exit finished before the timer. */
		release() {
			clearTimeout(exitTimer);
			setMounted(false);
		},
		/** Follows an open state owned elsewhere: shows or hides when it changes. */
		follow(isOpen: () => boolean) {
			createEffect(
				on(isOpen, (value) => (value ? show() : hide()), { defer: true }),
			);
		},
	};
}
