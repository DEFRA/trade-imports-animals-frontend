/**
 * Spike D (standalone) — the journey shell's public surface, re-exported from
 * the focused modules it was split into so importers and the vitest gate keep a
 * single stable entry point:
 *
 *   journey-shape.js   base path, layout, the task groups, path + breadcrumb builders
 *   nav.js             Back/Next URL resolution over the shape
 *   status-tags.js     task-list status tag presentation
 *   hub-view-model.js  hub (task list) view-model assembly
 *   shell-routes.js    the start and hub Hapi routes
 *
 * The model itself lives in model/ and is interpreted by runtime/ (the
 * `contract`); these modules only drive routing/status/navigation.
 */

export {
  BASE,
  LAYOUT,
  grouped,
  hubPath,
  addonStepPath,
  breadcrumbs
} from './journey-shape.js'
export { pathForStep, resolveNav, navBack, navNext } from './nav.js'
export { statusTag, groupTag, getYourQuoteItem } from './status-tags.js'
export { hubViewModel } from './hub-view-model.js'
export { shellRoutes } from './shell-routes.js'
export { addonByValue } from './lib/addons/index.js'
