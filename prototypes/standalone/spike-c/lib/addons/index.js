/**
 * Add-ons barrel — the public surface that was once a single `addons.js`:
 * the catalog data, the store-backed state helpers and the view/hub helpers.
 * Importers point at `./addons/index.js` for the same bindings.
 */
export { addonOptions, addonByValue } from './catalog.js'
export {
  getSelectedAddons,
  getAddonData,
  setSelectedAddons,
  saveAddonStep,
  stepComplete,
  addonComplete,
  allSelectedAddonsComplete
} from './state.js'
export {
  selectionItems,
  addonSequence,
  addonSummary,
  addonHubItems
} from './view.js'
