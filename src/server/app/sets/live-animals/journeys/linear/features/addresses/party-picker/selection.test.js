import { beforeEach, describe, expect, it, vi } from 'vitest'

import * as addressBook from '../../../../../../../services/address-book/index.js'
import { PARTIES } from '../parties.js'
import { answerFor, chosenPartyFor } from './selection.js'

const ORIGIN_FARM_ID = 'origin-farm'
const ORIGIN_FARM_NAME = 'Origin Farm'
const ORIGIN = PARTIES.find((party) => party.id === 'placeOfOrigin')

const liveRecord = (overrides = {}) => ({
  id: ORIGIN_FARM_ID,
  name: ORIGIN_FARM_NAME,
  deleted: false,
  address: {
    addressLine1: '1 Farm Lane',
    addressLine2: 'Rural Route',
    townOrCity: 'Cork',
    county: 'County Cork',
    postalOrZipCode: 'V95 X7P2',
    countryCode: 'IE',
    country: 'Ireland',
    telephoneNumber: '+353 1 234 5678',
    emailAddress: 'farm@example.com'
  },
  ...overrides
})

describe('chosenPartyFor', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('Should look the selected id up in the address book', async () => {
    vi.spyOn(addressBook, 'party').mockResolvedValue(liveRecord())

    const chosen = await chosenPartyFor('org-001', ORIGIN_FARM_ID)

    expect(chosen).toMatchObject({ id: ORIGIN_FARM_ID, name: ORIGIN_FARM_NAME })
    expect(addressBook.party).toHaveBeenCalledWith('org-001', ORIGIN_FARM_ID)
  })

  it('Should treat a soft-deleted record as no selection', async () => {
    vi.spyOn(addressBook, 'party').mockResolvedValue(
      liveRecord({ deleted: true })
    )

    expect(await chosenPartyFor('org-001', ORIGIN_FARM_ID)).toBeUndefined()
  })

  it('Should not call the address book when nothing is selected', async () => {
    const partySpy = vi.spyOn(addressBook, 'party')

    expect(await chosenPartyFor('org-001', '')).toBeUndefined()
    expect(partySpy).not.toHaveBeenCalled()
  })
})

describe('answerFor', () => {
  it('Should copy the picked record onto the answer, noting which record it was picked from', () => {
    expect(answerFor(ORIGIN, liveRecord())).toEqual({
      pickedFromId: ORIGIN_FARM_ID,
      name: ORIGIN_FARM_NAME,
      phone: '+353 1 234 5678',
      email: 'farm@example.com',
      address: {
        addressLine1: '1 Farm Lane',
        addressLine2: 'Rural Route',
        townOrCity: 'Cork',
        county: 'County Cork',
        postcode: 'V95 X7P2',
        countryCode: 'IE'
      }
    })
  })
})
