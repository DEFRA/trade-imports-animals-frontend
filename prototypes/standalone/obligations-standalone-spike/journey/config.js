/**
 * Shell identity — a graft-12 mirror of spike-a's journey/config.js so
 * route and shell code diff line-for-line across paradigms: the BASE
 * mount path, the layout and template roots, and the frozen hub shape
 * literal. The hub shape carries Flow ids only; titles, hints and
 * statuses all come from model/flow.json and the evaluation at render
 * time. The colocated alignment test asserts every id below against
 * flow.json.
 */

export const BASE =
  '/prototype-standalone/obligations-standalone-spike/task-list-with-linear-tasks'
export const TEMPLATES = 'standalone/obligations-standalone-spike/templates'
export const LAYOUT = `${TEMPLATES}/layout.njk`

/** model/flow.json's id — the flowId stamped on every Journey document. */
export const FLOW_ID = 'car-insurance-quote-flow'

const deepFreeze = (value) => {
  if (value !== null && typeof value === 'object') {
    Object.values(value).forEach(deepFreeze)
    Object.freeze(value)
  }
  return value
}

// The journey shape, hardcoded like spike-a's `grouped` literal: three
// always-live task groups, the add-on fan-out and the gated quote row.
export const hubShape = deepFreeze({
  kind: 'grouped',
  groups: [
    { sectionId: 'email', pageIds: ['email'] },
    {
      sectionId: 'about-you-and-your-vehicle',
      pageIds: ['about-you', 'your-vehicle']
    },
    {
      sectionId: 'your-driving-and-cover',
      pageIds: ['driving-history', 'claims', 'cover-type', 'optional-extras']
    }
  ],
  addons: {
    sectionId: 'add-to-your-policy',
    selectionPageId: 'addons',
    addonSectionIds: ['named-driver', 'modifications', 'protected-ncd']
  },
  quote: { sectionId: 'get-your-quote', pageId: 'quote-summary' }
})
