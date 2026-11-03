import type { DialogRootState } from '../root/use-dialog-root';

/** Registers the title with the dialog for as long as the calling component lives; spread the result on `@ghia/solid`'s `DialogTitle`. */
export function createDialogTitle(root: DialogRootState) {
	root.registerTitle();
	return { id: root.titleId };
}
