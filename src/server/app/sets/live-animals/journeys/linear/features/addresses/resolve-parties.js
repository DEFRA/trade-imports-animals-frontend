import * as addressBook from '../../../../../../services/address-book/index.js'
import { PARTIES, CONTACT_PARTY } from './parties.js'

const RESOLVED = Symbol('resolvedParties')

const PARTY_IDS = [...PARTIES.map((party) => party.id), CONTACT_PARTY.id]

/** The organisation whose address book this request reads.
 *
 * Always the signed-in session's organisation, forwarded as-is — never a value
 * from a payload or a stored record. The address book runs no authentication of
 * its own and treats this as the authenticated organisation, so anything else
 * would be asserting an identity rather than passing one on. */
export const organisationIdOf = (request) =>
  request?.auth?.credentials?.organisationId

/** A party answer is either a REFERENCE to an address-book record or an inline
 * address entered directly (AC5). A reference resolves to the record's current
 * details; an inline answer is already the details and passes straight through.
 *
 * A deleted record resolves to nothing, so the row renders as "not provided" —
 * the UCD decision to treat a deleted address as if it were never entered. An
 * outage is NOT that: the address book throws, and the throw propagates, because
 * an unavailable service must never be indistinguishable from a deletion. */
const resolveOne = async (orgId, answer) => {
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
    PARTY_IDS.map(async (id) => [id, await resolveOne(orgId, answers[id])])
  )
  const resolved = Object.fromEntries(entries)

  if (request?.app) {
    request.app[RESOLVED] = resolved
  }
  return resolved
}
