import { expect, spyOn, test } from 'bun:test';
import type { HoverEvent } from './hooks/use-hover-shared';
import { safePolygon } from './safe-polygon';

interface FakeElement {
	getBoundingClientRect(): {
		x: number;
		y: number;
		width: number;
		height: number;
	};
	parent?: FakeElement;
}

function box(x: number, y: number, width: number, height: number): FakeElement {
	return { getBoundingClientRect: () => ({ x, y, width, height }) };
}

// The popup sits above the trigger. It is narrower than the trigger and taller.
//   popup:   x 120..180, y 100..150
//   trigger: x 100..200, y 200..240
//   strip between them (the "trough"): x 120..180, y 149..201
const popup = box(120, 100, 60, 50);
const trigger = box(100, 200, 100, 40);
const child = {
	getBoundingClientRect: popup.getBoundingClientRect,
	parent: popup,
};

function move(clientX: number, clientY: number, target: object | null = null) {
	return {
		type: 'mousemove',
		clientX,
		clientY,
		target,
		relatedTarget: null,
	} satisfies HoverEvent;
}

function leave(
	clientX: number,
	clientY: number,
	target: object | null = trigger,
	relatedTarget: object | null = null,
) {
	return {
		type: 'mouseleave',
		clientX,
		clientY,
		target,
		relatedTarget,
	} satisfies HoverEvent;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function track(
	from: { x: number; y: number },
	options: {
		side?: 'top' | 'right' | 'bottom' | 'left';
		hasOpenChild?: () => boolean;
	} = {},
) {
	const closed: number[] = [];
	const handler = safePolygon()({
		x: from.x,
		y: from.y,
		side: options.side ?? 'top',
		elements: { domReference: trigger, floating: popup },
		hasOpenChild: options.hasOpenChild,
		onClose: () => closed.push(closed.length),
	});
	return { handler, closed };
}

test('leaving the trigger on the side away from the popup closes at once', () => {
	const { handler, closed } = track({ x: 110, y: 239 });
	handler(leave(110, 239));
	expect(closed).toHaveLength(1);
});

test('the pointer in the strip between the two boxes never closes it', async () => {
	const { handler, closed } = track({ x: 150, y: 199 });
	handler(leave(150, 199));
	handler(move(150, 180));
	handler(move(150, 160));
	await sleep(70);
	expect(closed).toHaveLength(0);
});

test('a move outside the polygon closes it', () => {
	const { handler, closed } = track({ x: 110, y: 199 });
	handler(leave(110, 199));
	expect(closed).toHaveLength(0);
	// Left of the line from the leave point to the popup's corner.
	handler(move(100, 160));
	expect(closed).toHaveLength(1);
});

test('a move inside the polygon, off the strip, keeps it open; stopping there closes it after 40 ms', async () => {
	const { handler, closed } = track({ x: 110, y: 199 });
	handler(leave(110, 199));
	handler(move(112, 180));
	expect(closed).toHaveLength(0);
	await sleep(20);
	expect(closed).toHaveLength(0);
	await sleep(40);
	expect(closed).toHaveLength(1);
});

test('the next move cancels the stop timer', async () => {
	const { handler, closed } = track({ x: 110, y: 199 });
	handler(leave(110, 199));
	handler(move(112, 180));
	await sleep(20);
	handler(move(113, 170));
	await sleep(30);
	expect(closed).toHaveLength(0);
	await sleep(40);
	expect(closed).toHaveLength(1);
});

test('dispose cancels the stop timer', async () => {
	const { handler, closed } = track({ x: 110, y: 199 });
	handler(leave(110, 199));
	handler(move(112, 180));
	handler.dispose?.();
	await sleep(70);
	expect(closed).toHaveLength(0);
});

test('a pointer that crawls (under 0.1 px/ms) closes it; a quick one does not', () => {
	let now = 1000;
	const clock = spyOn(performance, 'now').mockImplementation(() => now);
	try {
		const slow = track({ x: 110, y: 199 });
		slow.handler(leave(110, 199));
		now += 10;
		slow.handler(move(112, 190));
		now += 100;
		// 1 px in 100 ms.
		slow.handler(move(112, 189));
		expect(slow.closed).toHaveLength(1);

		const quick = track({ x: 110, y: 199 });
		quick.handler(leave(110, 199));
		now += 10;
		quick.handler(move(112, 190));
		now += 10;
		// About 3 px in 10 ms.
		quick.handler(move(113, 187));
		expect(quick.closed).toHaveLength(0);
	} finally {
		clock.mockRestore();
	}
});

test('once the pointer has landed on the popup, leaving the popup anywhere but the strip closes it', () => {
	const { handler, closed } = track({ x: 150, y: 199 });
	handler(leave(150, 199));
	handler(move(150, 120, popup));
	handler(move(150, 125, child));
	expect(closed).toHaveLength(0);
	// Out through the top of the popup.
	handler(move(150, 60));
	expect(closed).toHaveLength(1);
});

test('the strip stays open after landing, so the pointer can come back to the trigger', () => {
	const { handler, closed } = track({ x: 150, y: 199 });
	handler(leave(150, 199));
	handler(move(150, 120, popup));
	handler(move(150, 170));
	expect(closed).toHaveLength(0);
});

test('a leave from the popup into the trigger does not close it', () => {
	const { handler, closed } = track({ x: 150, y: 199 });
	handler(leave(150, 199));
	handler(move(150, 120, popup));
	handler(move(150, 220, trigger));
	expect(closed).toHaveLength(0);
});

test('a leave whose related target is inside the popup is ignored', () => {
	const { handler, closed } = track({ x: 110, y: 199 });
	handler(leave(60, 300, trigger, child));
	expect(closed).toHaveLength(0);
});

test('an open nested popup holds it open however far the pointer goes', () => {
	const { handler, closed } = track(
		{ x: 110, y: 199 },
		{ hasOpenChild: () => true },
	);
	handler(leave(110, 199));
	handler(move(10, 10));
	handler(move(400, 400));
	expect(closed).toHaveLength(0);
});

test('a popup below the trigger mirrors it', () => {
	const below = box(120, 260, 60, 50);
	const closed: number[] = [];
	const handler = safePolygon()({
		x: 110,
		y: 243,
		side: 'bottom',
		elements: { domReference: trigger, floating: below },
		onClose: () => closed.push(0),
	});
	handler(leave(110, 243));
	expect(closed).toHaveLength(0);
	handler(move(100, 280));
	expect(closed).toHaveLength(1);
});

test('a popup beside the trigger: the strip is between them, the far side closes', () => {
	const beside = box(230, 190, 50, 60);
	const closed: number[] = [];
	const handler = safePolygon()({
		x: 201,
		y: 215,
		side: 'right',
		elements: { domReference: trigger, floating: beside },
		onClose: () => closed.push(0),
	});
	handler(leave(201, 215));
	handler(move(215, 220));
	expect(closed).toHaveLength(0);
	handler(move(215, 300));
	expect(closed).toHaveLength(1);
	// Leaving through the trigger's far edge.
	const away = safePolygon()({
		x: 101,
		y: 215,
		side: 'right',
		elements: { domReference: trigger, floating: beside },
		onClose: () => closed.push(0),
	});
	away(leave(101, 215));
	expect(closed).toHaveLength(2);
});

test('it carries blockPointerEvents for the wiring to read', () => {
	expect(safePolygon().__options?.blockPointerEvents).toBe(false);
	expect(
		safePolygon({ blockPointerEvents: true }).__options?.blockPointerEvents,
	).toBe(true);
});
