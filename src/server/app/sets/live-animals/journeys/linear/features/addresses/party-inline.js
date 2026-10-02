import { toWireAddress } from '../../../../../../services/address-book/to-wire-address.js'

/** A copy of the picked address-book record, persisted on the notification and
 * in journey answers. No id travels with it: once copied, the record and the
 * notification are independent, so a later edit or delete in the book never
 * reaches the notification. */
export const answerForInlineParty = (chosen) => ({
  name: chosen.name,
  phone: chosen.address?.telephoneNumber,
  email: chosen.address?.emailAddress,
  address: toWireAddress(chosen.address ?? {})
})
