import { type HostElement, setProp } from "@gpuix/solid";
import { onCleanup, onMount } from "solid-js";

/**
 * Base UI's `markOthers`: while a modal is up, everything outside it leaves the
 * accessibility tree. The page and the popup are not siblings, so this walks up
 * from the popup and hides each level's other children, the way the browser
 * version walks up to `<body>`. Pointer and Tab are already held by the modal's
 * layer and trap, which is why this is `aria-hidden` and not `inert`: the
 * page would otherwise lose pointer input a stacked or scoped dialog still
 * needs.
 */
function hideOutside(popup: HostElement) {
	const hidden: HostElement[] = [];
	let child: HostElement = popup;
	for (;;) {
		const parent = child.parent;
		if (parent === null) break;
		for (const sibling of parent.children) {
			if (sibling === child || sibling.kind !== "element") continue;
			if (sibling.props.get("aria-hidden") === true) continue;
			setProp(sibling, "aria-hidden", true);
			hidden.push(sibling);
		}
		if (parent.kind === "root") break;
		child = parent;
	}
	return () => {
		for (const sibling of hidden) setProp(sibling, "aria-hidden", undefined, true);
	};
}

/** Put it inside a modal popup, built once: it hides the rest of the page for as long as the popup is mounted. */
export function HideOutside(props: { popup: () => HostElement | undefined }) {
	onMount(() => {
		const popup = props.popup();
		if (popup === undefined) throw new Error("HideOutside: the popup is not mounted");
		onCleanup(hideOutside(popup));
	});
	return null;
}
