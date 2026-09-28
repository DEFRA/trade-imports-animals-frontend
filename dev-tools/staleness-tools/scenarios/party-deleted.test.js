import { describe, expect, it, vi } from 'vitest'

import { obligations } from '../../../src/server/app/sets/live-animals/obligations/index.js'
import {
  CONTACT_PARTY,
  PARTIES
} from '../../../src/server/app/sets/live-animals/journeys/linear/features/addresses/parties.js'
import { partyDeleted } from './party-deleted.js'

const REFERENCE_NUMBER = 'GBN-AG-26-TEST01'

const idOf = (name) => obligations.find((o) => o.name === name).id
const consignorId = idOf('consignor')
const contactAddressId = idOf('contactAddress')

const partyEntry = (name, value) => ({ obligationId: idOf(name), value })

const mockCollection = ({ doc, updateResult = { matchedCount: 1 } }) => ({
  findOne: vi.fn().mockResolvedValue(doc),
  updateOne: vi.fn().mockResolvedValue(updateResult)
})

describe('#partyDeleted', () => {
  it('Should throw when the notification does not exist', async () => {
    const notifications = mockCollection({ doc: null })
    await expect(
      partyDeleted.mutate(notifications, REFERENCE_NUMBER)
    ).rejects.toThrow(/not found in the notifications collection/)
  })

  it('Should throw when no party fulfilment carries an addressId', async () => {
    const notifications = mockCollection({
      doc: {
        fulfilments: [{ obligationId: 'not-a-party', value: 'anything' }]
      }
    })
    await expect(
      partyDeleted.mutate(notifications, REFERENCE_NUMBER)
    ).rejects.toThrow(/no party fulfilments with an addressId/)
    expect(notifications.updateOne).not.toHaveBeenCalled()
  })

  it('Should rewrite every party fulfilment that carries an addressId to the ghost id', async () => {
    const notifications = mockCollection({
      doc: {
        fulfilments: [
          partyEntry('consignor', { addressId: 'was-real' }),
          partyEntry('contactAddress', { addressId: 'also-real' })
        ]
      }
    })
    await partyDeleted.mutate(notifications, REFERENCE_NUMBER)
    expect(notifications.updateOne).toHaveBeenCalledTimes(2)
    for (const call of notifications.updateOne.mock.calls) {
      const [, update] = call
      expect(update.$set['fulfilments.$.value'].addressId).toMatch(
        /^eudpa-573-ghost-/
      )
    }
  })

  it('Should recognise every role sourced from PARTIES + CONTACT_PARTY', () => {
    // Pin: the scenario's PARTIES source must resolve to real obligation ids.
    // If a role is added to PARTIES / CONTACT_PARTY but not to the obligations
    // manifest, this fails.
    const names = [...PARTIES.map((p) => p.id), CONTACT_PARTY.id]
    for (const name of names) {
      expect(obligations.find((o) => o.name === name)).toBeTruthy()
    }
  })

  it('Should ignore non-party fulfilments even when they resemble party shape', async () => {
    const notifications = mockCollection({
      doc: {
        fulfilments: [
          {
            obligationId: 'unrelated-obligation',
            value: { addressId: 'looks-like-a-party' }
          },
          partyEntry('consignor', { addressId: 'real-consignor' })
        ]
      }
    })
    await partyDeleted.mutate(notifications, REFERENCE_NUMBER)
    // Only the consignor was rewritten.
    expect(notifications.updateOne).toHaveBeenCalledTimes(1)
    const [filter] = notifications.updateOne.mock.calls[0]
    expect(filter['fulfilments.obligationId']).toBe(consignorId)
  })

  it('Should recognise contactAddress alongside the five PARTIES', () => {
    // Sanity — the barrel of party names includes contact.
    const names = [...PARTIES.map((p) => p.id), CONTACT_PARTY.id]
    expect(names).toContain('contactAddress')
    expect(idOf('contactAddress')).toBe(contactAddressId)
  })
})
