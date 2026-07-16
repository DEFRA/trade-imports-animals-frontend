import { describe, expect, test, vi, beforeEach } from 'vitest'
import { getOperatorFormCountries } from './operator-countries.js'
import { countriesClient } from '../common/clients/countries-client.js'

vi.mock('../common/clients/countries-client.js', () => ({
  countriesClient: { getCountries: vi.fn() }
}))

const mdmList = [
  { code: 'FI', name: 'Finland' },
  { code: 'FR', name: 'France' }
]

describe('getOperatorFormCountries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('adds the United Kingdom to the front of the MDM list, which omits it', async () => {
    countriesClient.getCountries.mockResolvedValue(mdmList)

    const countries = await getOperatorFormCountries('trace-1')

    expect(countries[0]).toEqual({ code: 'GB', name: 'United Kingdom' })
    expect(countries.map(({ name }) => name)).toEqual([
      'United Kingdom',
      'Finland',
      'France'
    ])
  })

  test('does not add a second United Kingdom if reference-data already returns it', async () => {
    countriesClient.getCountries.mockResolvedValue([
      { code: 'FI', name: 'Finland' },
      { code: 'GB', name: 'United Kingdom' }
    ])

    const countries = await getOperatorFormCountries('trace-1')

    expect(countries.filter(({ code }) => code === 'GB')).toHaveLength(1)
  })

  test('throws when reference-data returns an empty list (an outage must not leave only the UK)', async () => {
    countriesClient.getCountries.mockResolvedValue([])

    await expect(getOperatorFormCountries('trace-1')).rejects.toThrow()
  })

  test('propagates a reference-data failure', async () => {
    countriesClient.getCountries.mockRejectedValue(
      new Error('Failed to get countries')
    )

    await expect(getOperatorFormCountries('trace-1')).rejects.toThrow(
      'Failed to get countries'
    )
  })
})
