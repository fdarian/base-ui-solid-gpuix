/** Base UI's default match: `Intl.Collator`, ignoring case, accents and punctuation. */
const collator = new Intl.Collator(undefined, {
	usage: 'search',
	sensitivity: 'base',
	ignorePunctuation: true,
});

/** Base UI `getFilter().contains`: slides a window over `text` and compares each slice to `query` with the collator. */
export function contains(text: string, query: string) {
	if (query === '') return true;
	for (let start = 0; start <= text.length - query.length; start++) {
		if (
			collator.compare(text.slice(start, start + query.length), query) === 0
		) {
			return true;
		}
	}
	return false;
}
