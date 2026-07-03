import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * The contract barrel — exactly 21 pinned exports realising the 16-item
 * surface (TOOL-21), the ONLY module routes import. It doubles as
 * interrogation Level 1: importing this file in a REPL answers "what
 * can this journey do" in the doc's own vocabulary. The surface-drift
 * test pins the export list, so a new capability is a deliberate,
 * reviewed addition — markCollectionReviewed is one such (parity ruling
 * c: Continue on an empty claims list counts complete on the hub).
 */

// [status]
export { evaluate, journeyState, canSubmit } from './status.js'
// [view]
export { hubViewModel, pageViewModel, cyaRows, resolveReasons } from './view.js'
// [navigation]
export {
  nextAfter,
  sectionEntry,
  firstApplicablePage,
  firstUnfulfilledPage,
  firstPagePresentingObligation,
  changeTarget
} from './navigation.js'
// [mutation]
export {
  checkSave,
  applyAnswers,
  addFulfilment,
  markCollectionReviewed,
  removeFulfilment
} from './mutation.js'
// [submit]
export { submit } from './submit.js'
// [guards]
export { guardPage } from './guards.js'

const modelDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'model'
)
const rawModelFile = (file) =>
  fs.readFileSync(path.join(modelDir, file), 'utf8')

/**
 * Interrogation Level 3's data source: the two model files VERBATIM
 * (raw JSON text, byte-identical to what is committed), so
 * routes/model-endpoints.js can serve them without re-serialising.
 */
export const modelJson = () => ({
  obligations: rawModelFile('obligations.json'),
  flow: rawModelFile('flow.json')
})
