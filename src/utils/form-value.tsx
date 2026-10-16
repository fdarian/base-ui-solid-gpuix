import { type HostElement, useGpuixRequired } from '@gpuix/solid';

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
	return (
		<input
			name={props.name}
			value={props.value}
			required={props.required}
			disabled={props.disabled}
			tabIndex={-1}
			aria-hidden
			onFocus={() => {
				const target = props.focusTarget();
				if (target === undefined) throw new Error('Form value has no control');
				renderer.focusElement?.(target.id);
			}}
			style={{
				position: 'absolute',
				top: 0,
				left: 0,
				width: 1,
				height: 1,
				opacity: 0,
				pointerEvents: 'none',
				keyboardFocusDim: false,
			}}
		/>
	);
}
