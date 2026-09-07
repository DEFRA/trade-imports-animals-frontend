import { beforeEach, describe, expect, it, vi } from 'vitest'

import * as addressBook from '../../../../../../../services/address-book/index.js'
import { SUBMITTED } from '../../../../../../../engine/persistence/records.js'
import { PARTIES } from '../parties.js'
import { selectedPartyFor } from './selection.js'

const ORIGIN_FARM_ID = 'origin-farm'
const ORIGIN = PARTIES.find((party) => party.id === 'placeOfOrigin')

describe('selectedPartyFor', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('Should render stored inline details on a submitted notification without re-resolving', async () => {
    const journey = { status: SUBMITTED }
    const answers = {
      placeOfOrigin: {
        addressId: ORIGIN_FARM_ID,
        name: 'Frozen Origin Farm',
        address: {
          addressLine1: '1 Farm Lane',
          postcode: 'V95 X7P2',
          countryCode: 'IE'
        }
      }
    }
    const partySpy = vi.spyOn(addressBook, 'party')

    const selected = await selectedPartyFor(
      journey,
      'org-001',
      ORIGIN,
      answers,
      ORIGIN_FARM_ID
    )

    expect(selected).toMatchObject({
      id: ORIGIN_FARM_ID,
      name: 'Frozen Origin Farm'
    })
    expect(partySpy).not.toHaveBeenCalled()
  })

  it('Should resolve from the address book on a draft notification', async () => {
    const live = {
      id: ORIGIN_FARM_ID,
      name: 'Live Origin Farm',
      deleted: false,
      address: { addressLine1: '1 Farm Lane', country: 'Ireland' }
    }
    vi.spyOn(addressBook, 'party').mockResolvedValue(live)

    const selected = await selectedPartyFor(
      { status: 'DRAFT' },
      'org-001',
      ORIGIN,
      { placeOfOrigin: { addressId: ORIGIN_FARM_ID } },
      ORIGIN_FARM_ID
    )

    expect(selected).toBe(live)
  })
})
