/**
 * Records port — facade.
 *
 * Ported from A's `services/persistence/records/index.js` (see
 * /tmp/A-records-index.js). A's facade dispatched on `isRealMode()`
 * between a stub and a Mongo backing; B ports only the stub for now.
 * The real Mongo backing lands in Phase 6 alongside the
 * `notification-mapper` (see PLAN.md §10) — at that point this facade
 * grows an `isRealMode()`-style branch and the stub becomes the
 * fallback.
 *
 * BRIEF §Migration #4 / REPORT §5.1: the no-per-key-delete records
 * port. See `./stub.js` for the invariant.
 */

export { records } from './stub.js'
