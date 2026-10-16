import type { KeyEvent } from '@gpuix/solid';
import type { DialogRootState } from '../root/use-dialog-root';

/** Props for gpuix's `DialogPopup`. Merge `ref` and the rest yourself. */
export function createDialogPopup(root: DialogRootState) {
	return {
		id: root.popupId,
		get 'aria-labelledby'() {
			return root.hasTitle() ? root.titleId : undefined;
		},
		get 'aria-describedby'() {
			return root.hasDescription() ? root.descriptionId : undefined;
		},
		// Escape while this dialog fades out belongs to the dialog behind it. gpuix hands the key to the top layer once the element handlers have run, so taking this layer down here lets it through.
		onKeyDown(event: KeyEvent) {
			if (event.key === 'Escape' && !root.shown()) root.finish();
		},
	};
}
