import type { HostElement, KeyEvent } from "@gpuix/solid";

/** Ctrl, alt or cmd is held: the key is a shortcut, not a list command or a typed character. */
export function isChord(event: Pick<KeyEvent, "ctrlKey" | "altKey" | "metaKey">) {
	return event.ctrlKey === true || event.altKey === true || event.metaKey === true;
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
 * `scrollIntoView` only aligns a direct child of the scroller, and these rows
 * sit inside a wrapper, so the offset is set by hand.
 *
 * `row` is the fluid-hover rect: content space, independent of the scroll
 * offset. A painted row box would lag the offset by a frame, so successive
 * key presses would overshoot. A scroller that has not been painted (no client
 * height) is left where it is. `topInset` is the height of a sticky row
 * covering the scroller's top edge: a row under it counts as hidden.
 */
export function revealRow(
	scroller: HostElement,
	row: { top: number; height: number },
	mode: "nearest" | "center",
	padding = 0,
	topInset = 0,
) {
	const viewHeight = scroller.clientHeight;
	if (viewHeight === 0) return;
	const scrollTop = scroller.scrollTop;
	const top = row.top;
	const bottom = top + row.height;
	if (mode === "center") {
		scroller.scrollTo({
			top: Math.max(0, top + row.height / 2 - viewHeight / 2),
		});
		return;
	}
	const hiddenTop = scrollTop + topInset;
	if (top >= hiddenTop && bottom <= scrollTop + viewHeight) return;
	const target =
		top < hiddenTop
			? top - padding - topInset
			: bottom + padding - viewHeight;
	scroller.scrollTo({ top: Math.max(0, target) });
}
