/**
 * The your-vehicle feature's flow-page identity — authored ONCE here as a
 * pure data LEAF that imports NOTHING. Both the controller (which spreads it
 * into `meta`) and `flow/flow.js` (which spreads it and adds the flow-only
 * `gate`) import this same object, so the `{ id, slug }` is a shared
 * reference rather than a string coincidence. It stays import-free on
 * purpose: were it (or flow.js) to import a controller, the load-time cycle
 * flow -> controller -> engine -> status -> flow would leave `sections`
 * reading `undefined`.
 */
export const yourVehiclePage = { id: 'your-vehicle', slug: 'your-vehicle' }
