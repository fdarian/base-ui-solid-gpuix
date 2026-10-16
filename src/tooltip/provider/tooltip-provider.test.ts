import { expect, test } from 'bun:test';
import { createTooltipProvider } from './tooltip-provider';

test('the group reads its delays when asked, so they can change', () => {
	let delay = 200;
	const group = createTooltipProvider({
		delay: () => delay,
		skipDelay: () => 300,
	});
	expect(group.delay).toBe(200);
	delay = 50;
	expect(group.delay).toBe(50);
	expect(group.skipDelay).toBe(300);
	expect(group.closedAt).toBeUndefined();
});
