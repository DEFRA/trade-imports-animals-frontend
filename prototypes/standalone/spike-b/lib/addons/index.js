/**
 * Add-ons barrel — the catalogue data and the state helpers re-exported under
 * the same names the original single `addons.js` had, so import sites resolve
 * identically.
 */

export { addonOptions, addonByValue } from './data.js'
export {
  getSelectedAddons,
  getAddonData,
  setSelectedAddons,
  saveAddonStep,
  stepComplete,
  addonComplete,
  allSelectedAddonsComplete,
  selectionItems,
  addonSequence,
  addonSummary,
  addonHubItems
} from './state.js'
