/**
 * Sections barrel — the question catalogue and its query helpers re-exported
 * under the same names the original single `sections.js` had, so import sites
 * resolve identically.
 */

export { sections, sectionBySlug } from './data.js'
export {
  hasOwnRoutes,
  applies,
  applicableSections,
  allSectionsComplete,
  answerRows
} from './queries.js'
