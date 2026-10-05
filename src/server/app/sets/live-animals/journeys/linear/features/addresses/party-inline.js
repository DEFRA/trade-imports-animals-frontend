import { toWireAddress } from '../../../../../../services/address-book/to-wire-address.js'

/** The party answer for a picked address-book record, persisted on the
 * notification and in journey answers. */
export const answerForInlineParty = (chosen) => ({
  name: chosen.name,
  phone: chosen.address?.telephoneNumber,
  email: chosen.address?.emailAddress,
  address: toWireAddress(chosen.address ?? {})
})
