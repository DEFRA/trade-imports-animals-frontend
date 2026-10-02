import * as addressBook from '../../../../../../../services/address-book/index.js'
import { answerForInlineParty } from '../party-inline.js'

/** A picker selection, looked up in the book. A missing or soft-deleted record
 * is treated as no selection (UCD — never entered). */
export const chosenPartyFor = async (orgId, selectedId) => {
  if (!selectedId) {
    return undefined
  }
  const record = await addressBook.party(orgId, selectedId)
  return record && !record.deleted ? record : undefined
}

/** The answer to commit for a party the trader has just picked — a copy of the
 * record. The stored copy keeps no id, so returning to the picker starts with
 * nothing selected; picking again replaces the copy. */
export const answerFor = (_party, chosen) => answerForInlineParty(chosen)
