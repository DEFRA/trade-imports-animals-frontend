import { toWireAddress } from '../../../../../../services/address-book/to-wire-address.js'

export const answerForInlineParty = (chosen) => ({
  pickedFromId: chosen.id,
  name: chosen.name,
  phone: chosen.address?.phone,
  email: chosen.address?.email,
  address: toWireAddress(chosen.address ?? {})
})

export const copyOfStoredParty = (storedParty) => ({
  ...storedParty,
  address: { ...storedParty.address }
})
