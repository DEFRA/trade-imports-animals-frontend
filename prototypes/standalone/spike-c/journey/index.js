/**
 * Journey barrel — the journey shell surface that was once a single `journey.js`:
 * static config, URL/nav paths and the hub view model. Importers point at
 * `./journey/index.js` for the same bindings. The `addonByValue` re-export is
 * preserved (currently dead) for zero-surface-change with the original.
 */
export { BASE, LAYOUT, grouped } from './config.js'
export {
  hubPath,
  addonStepPath,
  breadcrumbs,
  pathForStep,
  resolveNav,
  navBack,
  navNext
} from './paths.js'
export { hubViewModel } from './hub-view.js'
export { addonByValue } from '../lib/addons/index.js'
