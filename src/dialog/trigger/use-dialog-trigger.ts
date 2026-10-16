import type { DialogRootState } from '../root/use-dialog-root';

/** Props for the element that opens the dialog: spread on gpuix's `DialogTrigger`. */
export function createDialogTrigger(root: DialogRootState) {
	return {
		'aria-haspopup': 'dialog' as const,
		get 'aria-controls'() {
			return root.mounted() ? root.popupId : undefined;
		},
		onClick: root.pressTrigger,
	};
}
