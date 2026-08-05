import * as addressBook from '../../../../../../../services/address-book/index.js'

/** The committed answer is a COPY of the record (name + address, no id),
 * so the picker re-finds the record it came from by name to pre-check its row. */
export const committedId = (answers, party) =>
  addressBook
    .parties(party.role)
    .find((record) => record.name === answers[party.id]?.name)?.id

// A row ticked on THIS page wins; otherwise the hidden field carries the
// selection made on an earlier page or search (no-JS safe across pagination).
export const chosenPartyFor = (party, selectedId) =>
  selectedId ? addressBook.party(party.role, selectedId) : undefined
