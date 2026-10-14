import { toWireAddress } from '../../../../../../services/address-book/to-wire-address.js'

/** `pickedFromId` only pre-selects the record when the picker reopens: nothing
 * reads details through it, and `toParty` drops it from the notification. */
export const answerForInlineParty = (chosen) => ({
  pickedFromId: chosen.id,
  name: chosen.name,
  phone: chosen.address?.phone,
  email: chosen.address?.email,
  address: toWireAddress(chosen.address ?? {})
})
