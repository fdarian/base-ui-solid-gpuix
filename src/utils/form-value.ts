import { type HostElement, useGpuixRequired } from '@ghia/solid';
import { jsx } from '@ghia/solid/jsx-runtime';

/**
 * Base UI's hidden input: what a form submits for a control that is not an
 * input itself. gpuix's `FormData` reads named, enabled `<input>`s, so this is
 * a real one that nothing can see, point at or reach with Tab. An empty
 * `required` one blocks the submit and takes focus, which it hands to the
 * control that holds the value.
 */
export function FormValue(props: {
	name: string | undefined;
	value: string;
	required: boolean;
	disabled: boolean;
	focusTarget: () => HostElement | undefined;
}) {
	const renderer = useGpuixRequired();
	// Getters, not values: jsx spreads them as live bindings, like the JSX attributes they replace.
	return jsx('input', {
		get name() {
			return props.name;
		},
		get value() {
			return props.value;
		},
		get required() {
			return props.required;
		},
		get disabled() {
			return props.disabled;
		},
		tabIndex: -1,
		'aria-hidden': true,
		onFocus: () => {
			const target = props.focusTarget();
			if (target === undefined) throw new Error('Form value has no control');
			renderer.focusElement?.(target.id);
		},
		style: {
			position: 'absolute',
			top: 0,
			left: 0,
			width: 1,
			height: 1,
			opacity: 0,
			pointerEvents: 'none',
			keyboardFocusDim: false,
		},
	});
}
