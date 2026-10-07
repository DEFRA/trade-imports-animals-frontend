import { afterEach, describe, expect, it, vi } from 'vitest'

import * as countries from '../../../../../../../services/countries/index.js'
import { invalidPartyErrors } from './invalid-parties.js'

const copyIn = (countryCode) => ({
  name: 'Astra Rosales',
  phone: '01632 960000',
  email: 'astra@example.com',
  address: {
    addressLine1: '43 East Hague Extension',
    addressLine2: '',
    townOrCity: 'Bern',
    county: '',
    postcode: '30055',
    countryCode
  }
})

describe('#invalidPartyErrors', () => {
  afterEach(() => vi.restoreAllMocks())

  it('Should accept a copy in a country the address book allows outside the SPS origin block', async () => {
    vi.spyOn(countries, 'addressBookCountries').mockResolvedValue([
      { code: 'GB', name: 'United Kingdom' },
      { code: 'US', name: 'United States' }
    ])

    expect(await invalidPartyErrors({ consignor: copyIn('US') })).toEqual({})
  })

  it('Should flag a copy in a country the address book does not offer', async () => {
    vi.spyOn(countries, 'addressBookCountries').mockResolvedValue([
      { code: 'GB', name: 'United Kingdom' }
    ])

    expect(
      Object.keys(await invalidPartyErrors({ consignor: copyIn('US') }))
    ).toEqual(['consignor'])
  })
})
