import type { HostMouseEvent } from '@gpuix/solid';
import type { ScrollAreaAxis } from '../viewport/get-thumb';

export function clamp(value: number, min: number, max: number) {
	return Math.min(max, Math.max(min, value));
}

export function pointerAlong(
	axis: ScrollAreaAxis,
	event: Pick<HostMouseEvent, 'x' | 'y'>,
) {
	const value = axis === 'y' ? event.y : event.x;
	if (value === undefined) throw new Error('mouse event without coordinates');
	return value;
}
