import { describe, expect, test } from 'vitest'

import { validateStoredAnswers } from './validate-stored.js'

const VALID_COUNTRY = 'AT'
const OTHER_VALID_COUNTRY = 'BE'

describe('#validateStoredAnswers for transit-countries', () => {
  test('Should return no errors when the trader has saved no transit countries', async () => {
    expect(await validateStoredAnswers({})).toEqual({})
  })

  test('Should return no errors when every saved country is still offered', async () => {
    expect(
      await validateStoredAnswers({
        transitedCountries: [VALID_COUNTRY, OTHER_VALID_COUNTRY]
      })
    ).toEqual({})
  })

  test('Should surface one stale entry in a list of valid ones', async () => {
    expect(
      await validateStoredAnswers({
        transitedCountries: [VALID_COUNTRY, 'ZZ']
      })
    ).toHaveProperty('transitedCountry')
  })

  test('Should surface a list where every entry is stale', async () => {
    expect(
      await validateStoredAnswers({
        transitedCountries: ['XX', 'YY', 'ZZ']
      })
    ).toHaveProperty('transitedCountry')
  })
})

// No round-trip inverse test: transit-countries stores an array of code
// strings under `transitedCountries`, identical to the payload shape. There
// is no projection to bug — the hook reads the stored list directly.
