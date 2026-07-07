/**
 * The state facade every page imports (`import * as state`). Names are
 * re-exported EXPLICITLY (never `export *`) so the facade surface cannot
 * silently widen; `configureReadyForQuote` is deliberately NOT re-exported —
 * boot roots import it straight from `./read.js`.
 */
export { get, makeScope, resume } from './read.js'
export {
  commit,
  appendEntry,
  appendEntryAt,
  updateEntry,
  updateEntryAt,
  removeEntry,
  removeEntryAt,
  submitJourney
} from './write.js'
export { collectionView } from './evaluate/collection-view.js'
