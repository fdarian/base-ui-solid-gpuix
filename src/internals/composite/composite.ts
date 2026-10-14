import type { HostElement, KeyEvent } from "@gpuix/solid";
import { readBounds } from "./bounds";

/** Ctrl, alt or cmd is held: the key is a shortcut, not a list command or a typed character. */
export function isChord(event: Pick<KeyEvent, "modifiers">) {
	const modifiers = event.modifiers;
	return (
		modifiers !== undefined && (modifiers.ctrl || modifiers.alt || modifiers.cmd)
	);
}

/**
 * The row a keyboard step lands on, skipping disabled rows. From no row
 * (`null`), the first step goes to the first enabled row, or the last when
 * going up. At an end it wraps, or with `wrap: false` stays where it is.
 * Returns `null` when no row can be entered.
 */
export function moveIndex(
	current: number | null,
	delta: 1 | -1,
	count: number,
	isDisabled?: (index: number) => boolean | undefined,
	wrap = true,
) {
	if (count === 0) return null;
	let index = current ?? (delta === 1 ? -1 : count);
	for (let step = 0; step < count; step++) {
		index += delta;
		if (index < 0 || index >= count) {
			if (!wrap) return current;
			index = (index + count) % count;
		}
		if (isDisabled?.(index) !== true) return index;
	}
	return null;
}

/** The first (or last) row a keyboard step can enter, or `null` when there is none. */
export function edgeIndex(
	edge: "first" | "last",
	count: number,
	isDisabled?: (index: number) => boolean | undefined,
) {
	return moveIndex(null, edge === "first" ? 1 : -1, count, isDisabled);
}

/**
 * Scrolls `scroller` so `row` is visible. `nearest` moves the least it can
 * (with `padding` of breathing room); `center` puts the row in the middle.
 * gpuix's own `scrollIntoView` only aligns a direct child of the scroller, and
 * these rows sit inside a wrapper, so the offset is set by hand.
 *
 * `row` is the fluid-hover rect: content space, independent of the scroll
 * offset. A painted row box would lag the offset by a frame, so successive
 * key presses would overshoot. A scroller that has not been painted is left
 * where it is.
 */
export function revealRow(
	scroller: HostElement,
	row: { top: number; height: number },
	mode: "nearest" | "center",
	padding = 0,
) {
	const renderer = scroller.root?.nativeRenderer;
	if (
		renderer?.getScrollOffset === undefined ||
		renderer.scrollTo === undefined
	) {
		throw new Error("This renderer does not expose scroll offsets");
	}
	const view = readBounds(scroller);
	const offset = renderer.getScrollOffset(scroller.id);
	if (view === null || offset === null) return;
	const scrollTop = -offset[1];
	const top = row.top;
	const bottom = top + row.height;
	if (mode === "center") {
		renderer.scrollTo(
			scroller.id,
			0,
			-Math.max(0, top + row.height / 2 - view.height / 2),
		);
		return;
	}
	if (top >= scrollTop && bottom <= scrollTop + view.height) return;
	const target =
		top < scrollTop ? top - padding : bottom + padding - view.height;
	renderer.scrollTo(scroller.id, 0, -Math.max(0, target));
}
