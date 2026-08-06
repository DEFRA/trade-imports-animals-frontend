import * as addressBook from '../../../../../../../services/address-book/index.js'

/** The committed answer holds the address-book id, so the row to pre-check is a
 * direct lookup. It used to be a copy with no id, re-found by matching on name —
 * which pre-checked the wrong row whenever two addresses shared a name. */
export const committedId = (answers, party) => answers[party.id]?.addressId

// A row ticked on THIS page wins; otherwise the hidden field carries the
// selection made on an earlier page or search (no-JS safe across pagination).
export const chosenPartyFor = async (orgId, selectedId) =>
  selectedId ? addressBook.party(orgId, selectedId) : undefined
