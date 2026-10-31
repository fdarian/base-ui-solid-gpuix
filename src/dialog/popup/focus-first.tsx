import { type HostElement, useGpuixRequired } from '@ghia/solid';
import { onCleanup, onMount } from 'solid-js';

/**
 * Moves focus from the popup to its first tab stop once it is up, which is
 * where Base UI puts it. gpuix focuses the popup itself.
 */
export function FocusFirst(props: { popup: () => HostElement | undefined }) {
	const renderer = useGpuixRequired();
	onMount(() => {
		const popup = props.popup();
		if (popup === undefined)
			throw new Error('FocusFirst: the popup is not mounted');
		// Not synchronous: native's tab order exists only once the popup has painted (gpuix README, "Dialog"), so `focusNextWithin` from mount finds no stop, and gpuix's own focus on the popup lands after this mount. A synchronous call was tried and left focus on the popup.
		const timer = setTimeout(() => renderer.focusNextWithin?.(popup.id), 0);
		onCleanup(() => clearTimeout(timer));
	});
	return null;
}
