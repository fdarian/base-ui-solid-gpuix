import type { KeyEvent } from "@gpuix/solid";
import { isChord } from "./list-nav";

/** Base UI `useTypeahead` `resetMs`. */
export const TYPEAHEAD_RESET_MS = 750;

/**
 * The first row at or after `startIndex` (wrapping) whose label starts with
 * `query`, skipping rows `isDisabled` rejects. -1 when nothing matches.
 */
export function matchTypeahead(
	labels: readonly (string | null | undefined)[],
	query: string,
	startIndex: number,
	isDisabled?: (index: number) => boolean,
) {
	if (labels.length === 0) return -1;
	const start = ((startIndex % labels.length) + labels.length) % labels.length;
	const lower = query.toLowerCase();
	for (let offset = 0; offset < labels.length; offset++) {
		const index = (start + offset) % labels.length;
		const label = labels[index];
		if (label === null || label === undefined) continue;
		if (!label.toLowerCase().startsWith(lower)) continue;
		if (isDisabled?.(index) === true) continue;
		return index;
	}
	return -1;
}

export interface TypeaheadOptions {
	/** One label per row, in row order. Read on every key, so it may change. */
	labels: () => readonly (string | null | undefined)[];
	/** Where a new session starts from: the selected row, else the highlighted one, else null. */
	current: () => number | null;
	onMatch: (index: number) => void;
	/** Rows to skip while matching. Omitted, every row can match (Base UI `Menu`); `Select` skips disabled rows. */
	isDisabled?: (index: number) => boolean;
	resetMs?: number;
}

export interface Typeahead {
	/**
	 * Feed a keydown. Returns true when the key belonged to typeahead (a
	 * character, or Space inside a session), so the caller must not also treat
	 * it as a command. Ctrl/cmd/alt chords and a Space that would start a
	 * session return false.
	 */
	handleKey: (event: Pick<KeyEvent, "key" | "ctrlKey" | "altKey" | "metaKey">) => boolean;
	/** A session is in progress: Space belongs to typeahead, not to activation. */
	typing: () => boolean;
	reset: () => void;
}

/**
 * Base UI's `useTypeahead` as a stateful helper: a 750 ms window, a failed
 * match ends the session, the same letter pressed again cycles through the
 * matches (unless some label starts with that doubled letter), and a new
 * session starts after the selected / highlighted row.
 */
export function createTypeahead(options: TypeaheadOptions): Typeahead {
	const resetMs = options.resetMs ?? TYPEAHEAD_RESET_MS;
	let buffer = "";
	let timer: ReturnType<typeof setTimeout> | undefined;
	/** Where this session searches from; moves on to the last match when the window lapses. */
	let prevIndex: number | null = null;
	let matchIndex: number | null = null;

	const reset = () => {
		clearTimeout(timer);
		buffer = "";
		prevIndex = null;
		matchIndex = null;
	};

	const handleKey = (event: Pick<KeyEvent, "key" | "ctrlKey" | "altKey" | "metaKey">) => {
		const key = event.key;
		if (key === undefined) return false;
		if (isChord(event)) return false;
		if (key === " " && buffer === "") return false;
		if (key.length !== 1) return false;

		const labels = options.labels();
		const isDisabled = options.isDisabled;
		const newSession = buffer === "";
		if (newSession) prevIndex = options.current() ?? -1;

		const allowRepeat = labels.every((label, index) => {
			if (label === null || label === undefined) return true;
			if (isDisabled?.(index) === true) return true;
			return label[0]?.toLowerCase() !== label[1]?.toLowerCase();
		});
		if (allowRepeat && buffer === key) {
			buffer = "";
			prevIndex = matchIndex;
		}

		buffer += key;
		clearTimeout(timer);
		timer = setTimeout(() => {
			buffer = "";
			prevIndex = matchIndex;
		}, resetMs);

		const index = matchTypeahead(labels, buffer, (prevIndex ?? 0) + 1, isDisabled);
		if (index !== -1) {
			matchIndex = index;
			options.onMatch(index);
		} else if (key !== " ") {
			buffer = "";
		}
		return true;
	};

	return { handleKey, typing: () => buffer !== "", reset };
}
