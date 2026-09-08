import * as addressBook from '../../../../../../../services/address-book/index.js'
import { answerForInlineParty } from '../party-inline.js'
import { toDisplayParty } from '../frozen-parties.js'
import { SUBMITTED } from '../../../../../../../engine/persistence/records.js'

/** The committed answer holds the address-book id, so the row to pre-check is a
 * direct lookup. It used to be a copy with no id, re-found by matching on name —
 * which pre-checked the wrong row whenever two addresses shared a name. */
export const committedId = (answers, party) => answers[party.id]?.addressId

/** Resolve a picker selection the same way resolveOne does: a missing or
 * soft-deleted record is treated as no selection (UCD — never entered). */
export const chosenPartyFor = async (orgId, selectedId) => {
  if (!selectedId) {
    return undefined
  }
  const record = await addressBook.party(orgId, selectedId)
  return record && !record.deleted ? record : undefined
}

/** The row to show as selected on the picker — frozen details on a submitted
 * notification, otherwise the current address-book record. */
export const selectedPartyFor = async (
  journey,
  orgId,
  party,
  answers,
  selectedId = committedId(answers, party)
) => {
  if (journey.status === SUBMITTED) {
    const stored = toDisplayParty(answers[party.id])
    if (stored && (!selectedId || stored.id === selectedId)) {
      return stored
    }
  }
  return chosenPartyFor(orgId, selectedId)
}

/** The answer to commit for a party the trader has just picked — inline details
 * alongside the address-book id so a SUBMITTED notification can render from the
 * stored copy while DRAFT and AMEND live-resolve from the id alone. */
export const answerFor = (_party, chosen) => answerForInlineParty(chosen)
