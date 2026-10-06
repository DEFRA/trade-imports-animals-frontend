import { toWireAddress } from '../../../../../../services/address-book/to-wire-address.js'

/** The party answer for a picked address-book record. `pickedFromId` only
 * pre-selects that record when the picker reopens; nothing reads details
 * through it, and it never reaches the notification. */
export const answerForInlineParty = (chosen) => ({
  pickedFromId: chosen.id,
  name: chosen.name,
  phone: chosen.address?.telephoneNumber,
  email: chosen.address?.emailAddress,
  address: toWireAddress(chosen.address ?? {})
})
