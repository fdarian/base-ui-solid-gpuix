import { createEffect, createSignal, on, onCleanup } from 'solid-js';

/**
 * `open` drives the animation; `mounted` outlives it by `exitMs`, so the exit
 * can play. The exit's own completion (`onMotionComplete`) can unmount sooner
 * with `release()`; the timer covers an exit that never animates.
 */
export function createPresence(exitMs: number, initiallyOpen = false) {
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
