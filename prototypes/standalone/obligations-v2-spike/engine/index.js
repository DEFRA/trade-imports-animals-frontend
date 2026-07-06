/**
 * THE narrow facade every page controller imports (`import * as state`). This is
 * a PURE BARREL — it owns zero logic; it re-exports exactly the one-directional
 * state surface pages are allowed to touch: read scope/status UP (`get`,
 * `makeScope`), write answers DOWN (`commit` / `appendEntry(At)` /
 * `updateEntry(At)` / `removeEntry(At)` / `submitJourney`) and read the loop
 * primitive (`collectionView`). There is deliberately NO `setScope` and NO
 * `delete(otherObligation)`.
 *
 * The names are re-exported EXPLICITLY (never `export *`) so the facade surface
 * cannot silently widen when a source module gains an internal export.
 * `configureReadyForQuote` is intentionally NOT re-exported here — boot roots
 * import it straight from `./read.js`, keeping the `state.*` surface stable.
 */
export { get, makeScope } from './read.js'
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
export { collectionView } from './collection-view.js'
