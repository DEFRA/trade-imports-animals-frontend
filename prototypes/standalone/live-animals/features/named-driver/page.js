/**
 * Import-free data leaf — importing a controller here (or in flow.js)
 * creates the load cycle flow -> controller -> engine -> status -> flow
 * and leaves `sections` undefined at boot.
 *
 * Only the drivers HUB is a flow page — the driver-detail, driver-entry and
 * driver-claim sub-pages are never listed in flow.js's `pages`.
 */
export const driversPage = { id: 'drivers', slug: 'addons/named-driver' }
