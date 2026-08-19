import * as addressBook from '../../../../../../services/address-book/index.js'
import { organisationIdOf } from '../../../../../../../common/helpers/organisation-id.js'
import { PARTIES, CONTACT_PARTY } from './parties.js'

const RESOLVED = Symbol('resolvedParties')

const ALL_PARTIES = [...PARTIES, CONTACT_PARTY]

export { organisationIdOf }

/** A party answer is either a REFERENCE to an address-book record or an inline
 * address. A reference resolves to the record's current details; an inline
 * answer is already the details and passes straight through.
 *
 * An inline party keeps its details even though it carries an `addressId` — the
 * id records which row was picked so the picker can pre-tick it, and must never
 * be treated as a live reference. Deleting the address it came from leaves the
 * copy alone.
 *
 * A deleted record resolves to nothing, so the row renders as "not provided" —
 * the UCD decision to treat a deleted address as if it were never entered. An
 * outage is NOT that: the address book throws, and the throw propagates, because
 * an unavailable service must never be indistinguishable from a deletion. */
const resolveOne = async (orgId, party, answer) => {
  if (party.inline || !answer?.addressId) {
    return answer
  }
  const record = await addressBook.party(orgId, answer.addressId)
  return record && !record.deleted ? record : undefined
}

/** Every party answer with its references resolved, keyed by obligation id.
 *
 * Deliberately kept OUT of `answers`. The write pipeline rebuilds a fulfilment
 * from `{ ...current.answers, ...patch }`, so anything merged into answers is
 * re-persisted by the next commit anywhere in the journey — a reference would
 * quietly grow a stale copy of the address beside it. Resolved details are for
 * rendering only and never round-trip.
 *
 * Memoised per request: one page can render the same party more than once. */
export const resolveParties = async (request, answers = {}) => {
  const cached = request?.app?.[RESOLVED]
  if (cached) {
    return cached
  }

  const orgId = organisationIdOf(request)
  const entries = await Promise.all(
    ALL_PARTIES.map(async (party) => [
      party.id,
      await resolveOne(orgId, party, answers[party.id])
    ])
  )
  const resolved = Object.fromEntries(entries)

  if (request?.app) {
    request.app[RESOLVED] = resolved
  }
  return resolved
}

/** Drop party answers whose address-book reference no longer resolves, so
 * display (resolveParties) and fulfilment/evaluation agree: a deleted address
 * behaves as if nothing were selected (UCD). Request-local — the next commit
 * that rebuilds from `current.answers` persists the clear.
 *
 * Inline parties are left alone. They hold their own details, so there is no
 * reference to dangle and nothing to clear when the address they were picked
 * from is deleted. */
export const withoutUnresolvedPartyRefs = async (request, answers = {}) => {
  const parties = await resolveParties(request, answers)
  let changed = false
  const next = { ...answers }
  for (const { id, inline } of ALL_PARTIES) {
    if (!inline && answers[id]?.addressId && parties[id] === undefined) {
      delete next[id]
      changed = true
    }
  }
  return changed ? next : answers
}
