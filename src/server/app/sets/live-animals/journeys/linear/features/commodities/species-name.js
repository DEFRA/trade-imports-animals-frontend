/** What a commodity line's species is called where the page names it in
 * English: MDM's common name, or its Latin name where MDM has none. */
export const speciesName = (entry) => entry.commonName ?? entry.speciesSelection
