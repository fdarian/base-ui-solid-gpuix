import { createSignal, createUniqueId, onCleanup, useContext } from 'solid-js';
import { createPresence } from '../../internals';
import { DialogRootContext } from './dialog-root-context';

export interface UseDialogRootOptions {
	open?: () => boolean | undefined;
	defaultOpen?: boolean;
	onOpenChange?: (open: boolean) => void;
	/** Block the page behind and keep Tab inside. Defaults to true. */
	modal?: () => boolean | undefined;
	/** The exit fade plus a buffer: the timer that takes the layer down when the fade never reports its end. */
	exitMs: number;
}

export interface DialogRootState {
	/** The target: the panel springs in while true and fades out while false. */
	shown: () => boolean;
	/** Outlives `shown` by the exit fade, so the layer stays up while it plays. */
	mounted: () => boolean;
	/** The exit fade ended: take the layer down. */
	finish: () => void;
	/** Inside another dialog: the parent's scrim already dims the page. */
	nested: boolean;
	modal: () => boolean;
	setOpen: (open: boolean) => void;
	popupId: string;
	titleId: string;
	descriptionId: string;
	/** The popup names itself by these only while they are rendered, as Base UI does. */
	hasTitle: () => boolean;
	hasDescription: () => boolean;
	registerTitle: () => void;
	registerDescription: () => void;
	/** A trigger press: closes an open dialog, reopens one that is fading out. */
	pressTrigger: () => void;
}

/**
 * Open state, exit hold and ids for a dialog over `@ghia/solid`'s headless `Dialog`,
 * which unmounts the moment it closes: `mounted` outlives `shown` by the exit
 * fade (Base UI's `preventUnmountOnClose`). Pass `mounted()` to `@ghia/solid`'s
 * `Dialog` as `open` and provide the result through `DialogRootContext`.
 *
 * Call it inside the component that renders the dialog, so `nested` can see a
 * parent dialog's context.
 */
export function createDialogRoot(
	options: UseDialogRootOptions,
): DialogRootState {
	const parent = useContext(DialogRootContext);
	const [uncontrolled, setUncontrolled] = createSignal(
		options.defaultOpen ?? false,
	);
	const shown = () => options.open?.() ?? uncontrolled();
	// onMotionComplete is the primary release; the timer covers an exit that
	// never animates (closed before it ever painted).
	const presence = createPresence(options.exitMs, shown());
	presence.follow(shown);
	const mounted = presence.mounted;

	const setOpen = (next: boolean) => {
		// `@ghia/native` keeps its layer up through the exit fade, so a second close request (a press on the backdrop or the ✕) can arrive when the dialog is already closed. Nothing to report.
		if (!next && !shown()) return;
		if (options.open?.() === undefined) setUncontrolled(next);
		options.onOpenChange?.(next);
	};

	const [titles, setTitles] = createSignal(0);
	const [descriptions, setDescriptions] = createSignal(0);

	return {
		shown,
		mounted,
		finish: presence.release,
		nested: parent !== undefined,
		modal: () => options.modal?.() ?? true,
		setOpen,
		popupId: createUniqueId(),
		titleId: createUniqueId(),
		descriptionId: createUniqueId(),
		hasTitle: () => titles() > 0,
		hasDescription: () => descriptions() > 0,
		registerTitle() {
			setTitles((count) => count + 1);
			onCleanup(() => setTitles((count) => count - 1));
		},
		registerDescription() {
			setDescriptions((count) => count + 1);
			onCleanup(() => setDescriptions((count) => count - 1));
		},
		pressTrigger() {
			if (shown()) setOpen(false);
			// Pressed while the exit fade plays: `@ghia/solid` still sees the dialog open and ignores it.
			else if (mounted()) setOpen(true);
		},
	};
}
