/**
 * `premium` activates on a `coverType` answer being present. The cover-type
 * feature (its collecting page and registered obligation) was removed in
 * inc-023, so this activator's source now lives here — the identity is all
 * the predicate reads (`answers.coverType`). No page writes that answer any
 * more, so `premium` can no longer enter scope in the running journey; the
 * whole quote feature goes in its own removal increment.
 */
const coverType = { id: 'coverType' }

export const premium = {
  id: 'premium',
  system: true,
  activatedBy: { obligation: coverType, present: true }
}

export const obligations = [premium]
