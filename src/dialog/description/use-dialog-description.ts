import type { DialogRootState } from '../root/use-dialog-root';

/** Registers the description with the dialog for as long as the calling component lives; spread the result on gpuix's `DialogDescription`. */
export function createDialogDescription(root: DialogRootState) {
	root.registerDescription();
	return { id: root.descriptionId };
}
