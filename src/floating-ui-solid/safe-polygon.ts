import type {
	HandleClose,
	HandleCloseOptions,
	HoverEvent,
} from './hooks/use-hover-shared';
import { type BoxElement, contains } from './utils/element';

/* The geometry is upstream's `floating-ui-react/safePolygon.ts` line for line; what differs is how the pieces are reached (boxes from `getBoundingClientRect`, containment by tree ancestry, a `hasOpenChild` callback for the floating tree). */

interface Box {
	left: number;
	right: number;
	top: number;
	bottom: number;
	width: number;
	height: number;
}

function toBox(element: BoxElement): Box {
	const rect = element.getBoundingClientRect();
	return {
		left: rect.x,
		right: rect.x + rect.width,
		top: rect.y,
		bottom: rect.y + rect.height,
		width: rect.width,
		height: rect.height,
	};
}

const CURSOR_SPEED_THRESHOLD = 0.1;
const CURSOR_SPEED_THRESHOLD_SQUARED =
	CURSOR_SPEED_THRESHOLD * CURSOR_SPEED_THRESHOLD;
const POLYGON_BUFFER = 0.5;

function hasIntersectingEdge(
	pointX: number,
	pointY: number,
	xi: number,
	yi: number,
	xj: number,
	yj: number,
) {
	return (
		yi >= pointY !== yj >= pointY &&
		pointX <= ((xj - xi) * (pointY - yi)) / (yj - yi) + xi
	);
}

function isPointInQuadrilateral(
	pointX: number,
	pointY: number,
	x1: number,
	y1: number,
	x2: number,
	y2: number,
	x3: number,
	y3: number,
	x4: number,
	y4: number,
) {
	let isInsideValue = false;

	if (hasIntersectingEdge(pointX, pointY, x1, y1, x2, y2)) {
		isInsideValue = !isInsideValue;
	}

	if (hasIntersectingEdge(pointX, pointY, x2, y2, x3, y3)) {
		isInsideValue = !isInsideValue;
	}

	if (hasIntersectingEdge(pointX, pointY, x3, y3, x4, y4)) {
		isInsideValue = !isInsideValue;
	}

	if (hasIntersectingEdge(pointX, pointY, x4, y4, x1, y1)) {
		isInsideValue = !isInsideValue;
	}

	return isInsideValue;
}

function isInsideRect(pointX: number, pointY: number, rect: Box) {
	return (
		pointX >= rect.left &&
		pointX <= rect.right &&
		pointY >= rect.top &&
		pointY <= rect.bottom
	);
}

function isInsideAxisAlignedRect(
	pointX: number,
	pointY: number,
	x1: number,
	y1: number,
	x2: number,
	y2: number,
) {
	const minX = Math.min(x1, x2);
	const maxX = Math.max(x1, x2);
	const minY = Math.min(y1, y2);
	const maxY = Math.max(y1, y2);

	return pointX >= minX && pointX <= maxX && pointY >= minY && pointY <= maxY;
}

export interface SafePolygonOptions extends HandleCloseOptions {}

/**
 * Generates a safe polygon area that the user can traverse without closing the
 * floating element once leaving the reference element.
 * @see https://floating-ui.com/docs/useHover#safepolygon
 */
export function safePolygon(options: SafePolygonOptions = {}) {
	const blockPointerEvents = options.blockPointerEvents ?? false;
	let timeout: ReturnType<typeof setTimeout> | undefined;
	const clearTimer = () => {
		clearTimeout(timeout);
		timeout = undefined;
	};

	const fn: HandleClose = (context) => {
		const x = context.x;
		const y = context.y;
		const side = context.side;
		const elements = context.elements;
		const onClose = context.onClose;
		const hasOpenChild = context.hasOpenChild;
		let hasLanded = false;
		let lastX: number | null = null;
		let lastY: number | null = null;
		let lastCursorTime = performance.now();

		function isCursorMovingSlowly(nextX: number, nextY: number) {
			const currentTime = performance.now();
			const elapsedTime = currentTime - lastCursorTime;

			if (lastX === null || lastY === null || elapsedTime === 0) {
				lastX = nextX;
				lastY = nextY;
				lastCursorTime = currentTime;
				return false;
			}

			const deltaX = nextX - lastX;
			const deltaY = nextY - lastY;
			const distanceSquared = deltaX * deltaX + deltaY * deltaY;
			const thresholdSquared =
				elapsedTime * elapsedTime * CURSOR_SPEED_THRESHOLD_SQUARED;

			lastX = nextX;
			lastY = nextY;
			lastCursorTime = currentTime;

			return distanceSquared < thresholdSquared;
		}

		function close() {
			clearTimer();
			onClose();
		}

		function onMouseMove(event: HoverEvent) {
			clearTimer();

			const domReference = elements.domReference;
			const floating = elements.floating;

			const clientX = event.clientX;
			const clientY = event.clientY;
			const target = event.target;
			const isLeave = event.type === 'mouseleave';
			const isOverFloatingEl = contains(floating, target);
			const isOverReferenceEl = contains(domReference, target);

			if (isOverFloatingEl) {
				hasLanded = true;

				if (!isLeave) {
					return;
				}
			}

			if (isOverReferenceEl) {
				hasLanded = false;

				if (!isLeave) {
					hasLanded = true;
					return;
				}
			}

			// Prevent overlapping floating element from being stuck in an open-close
			// loop: https://github.com/floating-ui/floating-ui/issues/1910
			if (isLeave && contains(floating, event.relatedTarget)) {
				return;
			}

			function hasOpenChildNode() {
				return hasOpenChild?.() === true;
			}

			function closeIfNoOpenChild() {
				if (!hasOpenChildNode()) {
					close();
				}
			}

			// If any nested child is open, abort.
			if (hasOpenChildNode()) {
				return;
			}

			const refRect = toBox(domReference);
			const rect = toBox(floating);
			const cursorLeaveFromRight = x > rect.right - rect.width / 2;
			const cursorLeaveFromBottom = y > rect.bottom - rect.height / 2;
			const isFloatingWider = rect.width > refRect.width;
			const isFloatingTaller = rect.height > refRect.height;
			const left = (isFloatingWider ? refRect : rect).left;
			const right = (isFloatingWider ? refRect : rect).right;
			const top = (isFloatingTaller ? refRect : rect).top;
			const bottom = (isFloatingTaller ? refRect : rect).bottom;

			// If the pointer is leaving from the opposite side, the "buffer" logic
			// creates a point where the floating element remains open, but should be
			// ignored.
			// A constant of 1 handles floating point rounding errors.
			if (
				(side === 'top' && y >= refRect.bottom - 1) ||
				(side === 'bottom' && y <= refRect.top + 1) ||
				(side === 'left' && x >= refRect.right - 1) ||
				(side === 'right' && x <= refRect.left + 1)
			) {
				closeIfNoOpenChild();
				return;
			}

			// Ignore when the cursor is within the rectangular trough between the
			// two elements. Since the triangle is created from the cursor point,
			// which can start beyond the ref element's edge, traversing back and
			// forth from the ref to the floating element can cause it to close. This
			// ensures it always remains open in that case.
			let isInsideTroughRect = false;

			switch (side) {
				case 'top':
					isInsideTroughRect = isInsideAxisAlignedRect(
						clientX,
						clientY,
						left,
						refRect.top + 1,
						right,
						rect.bottom - 1,
					);
					break;
				case 'bottom':
					isInsideTroughRect = isInsideAxisAlignedRect(
						clientX,
						clientY,
						left,
						rect.top + 1,
						right,
						refRect.bottom - 1,
					);
					break;
				case 'left':
					isInsideTroughRect = isInsideAxisAlignedRect(
						clientX,
						clientY,
						rect.right - 1,
						bottom,
						refRect.left + 1,
						top,
					);
					break;
				case 'right':
					isInsideTroughRect = isInsideAxisAlignedRect(
						clientX,
						clientY,
						refRect.right - 1,
						bottom,
						rect.left + 1,
						top,
					);
					break;
				default:
			}

			if (isInsideTroughRect) {
				return;
			}

			if (hasLanded && !isInsideRect(clientX, clientY, refRect)) {
				closeIfNoOpenChild();
				return;
			}

			if (!isLeave && isCursorMovingSlowly(clientX, clientY)) {
				closeIfNoOpenChild();
				return;
			}

			let isInsidePolygon = false;

			switch (side) {
				case 'top': {
					const cursorXOffset = isFloatingWider
						? POLYGON_BUFFER / 2
						: POLYGON_BUFFER * 4;
					const cursorPointOneX = isFloatingWider
						? x + cursorXOffset
						: cursorLeaveFromRight
							? x + cursorXOffset
							: x - cursorXOffset;
					const cursorPointTwoX = isFloatingWider
						? x - cursorXOffset
						: cursorLeaveFromRight
							? x + cursorXOffset
							: x - cursorXOffset;
					const cursorPointY = y + POLYGON_BUFFER + 1;

					const commonYLeft = cursorLeaveFromRight
						? rect.bottom - POLYGON_BUFFER
						: isFloatingWider
							? rect.bottom - POLYGON_BUFFER
							: rect.top;
					const commonYRight = cursorLeaveFromRight
						? isFloatingWider
							? rect.bottom - POLYGON_BUFFER
							: rect.top
						: rect.bottom - POLYGON_BUFFER;

					isInsidePolygon = isPointInQuadrilateral(
						clientX,
						clientY,
						cursorPointOneX,
						cursorPointY,
						cursorPointTwoX,
						cursorPointY,
						rect.left,
						commonYLeft,
						rect.right,
						commonYRight,
					);
					break;
				}
				case 'bottom': {
					const cursorXOffset = isFloatingWider
						? POLYGON_BUFFER / 2
						: POLYGON_BUFFER * 4;
					const cursorPointOneX = isFloatingWider
						? x + cursorXOffset
						: cursorLeaveFromRight
							? x + cursorXOffset
							: x - cursorXOffset;
					const cursorPointTwoX = isFloatingWider
						? x - cursorXOffset
						: cursorLeaveFromRight
							? x + cursorXOffset
							: x - cursorXOffset;
					const cursorPointY = y - POLYGON_BUFFER;

					const commonYLeft = cursorLeaveFromRight
						? rect.top + POLYGON_BUFFER
						: isFloatingWider
							? rect.top + POLYGON_BUFFER
							: rect.bottom;
					const commonYRight = cursorLeaveFromRight
						? isFloatingWider
							? rect.top + POLYGON_BUFFER
							: rect.bottom
						: rect.top + POLYGON_BUFFER;

					isInsidePolygon = isPointInQuadrilateral(
						clientX,
						clientY,
						cursorPointOneX,
						cursorPointY,
						cursorPointTwoX,
						cursorPointY,
						rect.left,
						commonYLeft,
						rect.right,
						commonYRight,
					);
					break;
				}
				case 'left': {
					const cursorYOffset = isFloatingTaller
						? POLYGON_BUFFER / 2
						: POLYGON_BUFFER * 4;
					const cursorPointOneY = isFloatingTaller
						? y + cursorYOffset
						: cursorLeaveFromBottom
							? y + cursorYOffset
							: y - cursorYOffset;
					const cursorPointTwoY = isFloatingTaller
						? y - cursorYOffset
						: cursorLeaveFromBottom
							? y + cursorYOffset
							: y - cursorYOffset;
					const cursorPointX = x + POLYGON_BUFFER + 1;

					const commonXTop = cursorLeaveFromBottom
						? rect.right - POLYGON_BUFFER
						: isFloatingTaller
							? rect.right - POLYGON_BUFFER
							: rect.left;
					const commonXBottom = cursorLeaveFromBottom
						? isFloatingTaller
							? rect.right - POLYGON_BUFFER
							: rect.left
						: rect.right - POLYGON_BUFFER;

					isInsidePolygon = isPointInQuadrilateral(
						clientX,
						clientY,
						commonXTop,
						rect.top,
						commonXBottom,
						rect.bottom,
						cursorPointX,
						cursorPointOneY,
						cursorPointX,
						cursorPointTwoY,
					);
					break;
				}
				case 'right': {
					const cursorYOffset = isFloatingTaller
						? POLYGON_BUFFER / 2
						: POLYGON_BUFFER * 4;
					const cursorPointOneY = isFloatingTaller
						? y + cursorYOffset
						: cursorLeaveFromBottom
							? y + cursorYOffset
							: y - cursorYOffset;
					const cursorPointTwoY = isFloatingTaller
						? y - cursorYOffset
						: cursorLeaveFromBottom
							? y + cursorYOffset
							: y - cursorYOffset;
					const cursorPointX = x - POLYGON_BUFFER;

					const commonXTop = cursorLeaveFromBottom
						? rect.left + POLYGON_BUFFER
						: isFloatingTaller
							? rect.left + POLYGON_BUFFER
							: rect.right;
					const commonXBottom = cursorLeaveFromBottom
						? isFloatingTaller
							? rect.left + POLYGON_BUFFER
							: rect.right
						: rect.left + POLYGON_BUFFER;

					isInsidePolygon = isPointInQuadrilateral(
						clientX,
						clientY,
						cursorPointX,
						cursorPointOneY,
						cursorPointX,
						cursorPointTwoY,
						commonXTop,
						rect.top,
						commonXBottom,
						rect.bottom,
					);
					break;
				}
				default:
			}

			if (!isInsidePolygon) {
				closeIfNoOpenChild();
			} else if (!hasLanded) {
				clearTimer();
				timeout = setTimeout(closeIfNoOpenChild, 40);
			}
		}

		return Object.assign(onMouseMove, { dispose: clearTimer });
	};

	fn.__options = {
		...options,
		blockPointerEvents,
	};

	return fn;
}
