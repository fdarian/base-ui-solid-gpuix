import { createContext, useContext } from 'solid-js';
import type { DialogRootState } from './use-dialog-root';

export const DialogRootContext = createContext<DialogRootState>();

export function useDialogRootContext() {
	const context = useContext(DialogRootContext);
	if (context === undefined) throw new Error('Must be used inside Dialog');
	return context;
}
