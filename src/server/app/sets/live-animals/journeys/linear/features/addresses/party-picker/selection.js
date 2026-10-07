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

export const answerFor = (_party, chosen) => answerForInlineParty(chosen)
