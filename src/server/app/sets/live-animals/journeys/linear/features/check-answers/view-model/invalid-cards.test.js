import { describe, expect, test } from 'vitest'

import { invalidCardErrors } from './invalid-cards.js'

const PORT_OF_ENTRY = 'port-of-entry'

describe('#invalidCardErrors', () => {
  test('Should return an empty map when no page failed', () => {
    expect(invalidCardErrors([])).toEqual({})
  })

  test('Should map a failing page id to its card message', () => {
    const result = invalidCardErrors([
      { id: PORT_OF_ENTRY, errors: { arrivalDateAtPort: 'bad' } }
    ])
    expect(result).toHaveProperty('arrivalDetails')
  })

  test('Should collapse multiple failures on the same card to one entry', () => {
    const result = invalidCardErrors([
      { id: PORT_OF_ENTRY, errors: { arrivalDateAtPort: 'bad' } },
      { id: PORT_OF_ENTRY, errors: { portOfEntry: 'also bad' } }
    ])
    expect(Object.keys(result)).toEqual(['arrivalDetails'])
  })

  test('Should carry each affected card separately when the failures span cards', () => {
    const result = invalidCardErrors([
      { id: 'origin', errors: { countryOfOrigin: 'bad' } },
      { id: 'transit-countries', errors: { transitedCountry: 'bad' } }
    ])
    expect(result).toHaveProperty('importDetails')
    expect(result).toHaveProperty('transitCountries')
  })

  test('Should drop a page id that has no card mapping (defensive)', () => {
    expect(
      invalidCardErrors([{ id: 'not-a-page', errors: { field: 'bad' } }])
    ).toEqual({})
  })
})
