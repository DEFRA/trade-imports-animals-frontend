import * as addressBook from '../../../../../../../services/address-book/index.js'
import { frozenPartiesOf } from '../frozen-parties.js'

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
  if (journey.frozenParties) {
    const frozen = frozenPartiesOf(journey.frozenParties)[party.id]
    if (frozen && (!selectedId || frozen.id === selectedId)) {
      return frozen
    }
  }
  return chosenPartyFor(orgId, selectedId)
}

/** The answer to commit for a party the trader has just picked.
 *
 * Holds the address-book id alone — the details are resolved on read, and
 * storing them here would let the next commit anywhere in the journey re-persist
 * a copy that has since gone stale. A submitted notification renders the
 * pre-submit details from {@link frozenPartiesOf} instead of re-resolving here. */
export const answerFor = (_party, chosen) => ({ addressId: chosen.id })
