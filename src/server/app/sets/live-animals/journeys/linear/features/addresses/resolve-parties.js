import * as addressBook from '../../../../../../services/address-book/index.js'
import { organisationIdOf } from '../../../../../../../common/helpers/organisation-id.js'
import { PARTIES, CONTACT_PARTY } from './parties.js'

const RESOLVED = Symbol('resolvedParties')

const ALL_PARTIES = [...PARTIES, CONTACT_PARTY]

export { organisationIdOf }

/** A party answer is an address-book reference. It resolves to the record's
 * current details for display. A deleted record resolves to nothing, so the
 * row renders as "not provided" — the UCD decision to treat a deleted address
 * as if it were never entered. An outage is NOT that: the address book throws,
 * and the throw propagates, because an unavailable service must never be
 * indistinguishable from a deletion. */
const resolveOne = async (orgId, _party, answer) => {
  if (!answer?.addressId) {
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
 * that rebuilds from `current.answers` persists the clear. */
export const withoutUnresolvedPartyRefs = async (request, answers = {}) => {
  const parties = await resolveParties(request, answers)
  let changed = false
  const next = { ...answers }
  for (const { id } of ALL_PARTIES) {
    if (answers[id]?.addressId && parties[id] === undefined) {
      delete next[id]
      changed = true
    }
  }
  return changed ? next : answers
}
