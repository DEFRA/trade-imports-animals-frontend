/**
 * The modifications feature's flow-page identities — authored ONCE here as a
 * pure data LEAF that imports NOTHING. Both each controller (which spreads
 * its page into `meta`) and `flow/flow.js` (which lists both pages in a
 * section) import these same objects, so the `{ id, slug }`
 * is a shared reference rather than a string coincidence. It stays
 * import-free on purpose: were it (or flow.js) to import a controller, the
 * load-time cycle flow -> controller -> engine -> status -> flow would leave
 * `sections` reading `undefined`.
 */
export const modificationsDescribePage = {
  id: 'modifications-describe',
  slug: 'addons/modifications/describe'
}

export const modificationsValuePage = {
  id: 'modifications-value',
  slug: 'addons/modifications/value'
}
