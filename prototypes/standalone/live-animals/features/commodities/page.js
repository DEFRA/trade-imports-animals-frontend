/**
 * Import-free data leaf — importing a controller here (or in flow.js)
 * creates the load cycle flow -> controller -> engine -> status -> flow
 * and leaves `sections` undefined at boot.
 *
 * Only the commodities LIST (loop hub) is a flow page — the select and
 * details entry sub-pages are never listed in flow.js's `pages`.
 */
export const commoditiesPage = { id: 'commodities', slug: 'commodities' }
