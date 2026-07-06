/**
 * The named-driver feature's flow-page identity — authored ONCE here as a pure
 * data LEAF that imports NOTHING. Both the controller (which spreads it into
 * `meta`) and `flow/flow.js` (which spreads it and adds the flow-only `gate`)
 * import this same object, so the `{ id, slug }` is a shared reference rather
 * than a string coincidence. It stays import-free on purpose: were it (or
 * flow.js) to import a controller, the load-time cycle flow -> controller ->
 * engine -> status -> flow would leave `sections` reading `undefined`.
 *
 * Only the drivers HUB is a flow page — the nested driver-detail, driver-entry
 * and driver-claim controllers are sub-pages reached from the hub (add/change/
 * remove/nested-claims) and are never listed in flow.js's `pages`.
 */
export const driversPage = { id: 'drivers', slug: 'addons/named-driver' }
