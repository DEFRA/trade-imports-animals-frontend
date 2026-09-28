import { obligations } from '../../../src/server/app/sets/live-animals/obligations/index.js'
import {
  CONTACT_PARTY,
  PARTIES
} from '../../../src/server/app/sets/live-animals/journeys/linear/features/addresses/parties.js'

const GHOST_ADDRESS_ID = 'eudpa-573-ghost-address-abcdef'

const partyIdToName = () => {
  const names = [...PARTIES.map((p) => p.id), CONTACT_PARTY.id]
  return new Map(
    obligations.filter((o) => names.includes(o.name)).map((o) => [o.id, o.name])
  )
}

const isPartyEntry = (idToName, entry) =>
  idToName.has(entry.obligationId) &&
  entry.value &&
  typeof entry.value === 'object' &&
  'addressId' in entry.value

export const partyDeleted = {
  id: 'party-deleted',
  summary:
    'Repoint every party fulfilment at an addressId the address-book service does not hold',
  mutate: async (notifications, referenceNumber) => {
    const doc = await notifications.findOne({ referenceNumber })
    if (!doc) {
      throw new Error(
        `Notification ${referenceNumber} not found in the notifications collection.`
      )
    }
    const idToName = partyIdToName()
    const partyEntries = (doc.fulfilments ?? []).filter((entry) =>
      isPartyEntry(idToName, entry)
    )
    if (partyEntries.length === 0) {
      throw new Error(
        `Notification ${referenceNumber} carries no party fulfilments with an addressId — the trader may not have reached the parties section yet.`
      )
    }
    for (const entry of partyEntries) {
      await notifications.updateOne(
        { referenceNumber, 'fulfilments.obligationId': entry.obligationId },
        { $set: { 'fulfilments.$.value': { addressId: GHOST_ADDRESS_ID } } }
      )
    }
    const rewrittenNames = partyEntries.map((e) => idToName.get(e.obligationId))
    console.log(
      `  → rewrote ${partyEntries.length} party fulfilment(s): ${rewrittenNames.join(', ')}`
    )
  }
}
