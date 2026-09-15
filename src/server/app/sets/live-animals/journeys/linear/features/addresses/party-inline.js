import { toWireAddress } from '../../../../../../services/address-book/to-wire-address.js'

/** Inline party shape persisted on the notification and in journey answers. */
export const answerForInlineParty = async (chosen) => ({
  addressId: chosen.id,
  name: chosen.name,
  phone: chosen.address?.telephoneNumber,
  email: chosen.address?.emailAddress,
  address: await toWireAddress(chosen.address ?? {})
})
