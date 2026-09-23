import { describe, expect, test } from 'vitest'

import { validateStoredAnswers } from './validate-stored.js'
import { answersFrom, formValuesFromAnswers } from './controller.js'

const VALID_COUNTRY = 'AT'

const storedAnswers = (overrides = {}) => ({
  countryOfOrigin: VALID_COUNTRY,
  regionOfOriginCodeRequirement: 'yes',
  regionOfOriginCode: `${VALID_COUNTRY}-123`,
  internalReferenceNumber: 'REF-1',
  ...overrides
})

describe('#validateStoredAnswers for origin', () => {
  test('Should return no errors when every stored value still validates', async () => {
    expect(await validateStoredAnswers(storedAnswers())).toEqual({})
  })

  test('Should return no errors when the region code is not required', async () => {
    expect(
      await validateStoredAnswers(
        storedAnswers({
          regionOfOriginCodeRequirement: 'no',
          regionOfOriginCode: ''
        })
      )
    ).toEqual({})
  })

  test('Should surface a stale country that the current catalogue no longer offers', async () => {
    const errors = await validateStoredAnswers(
      storedAnswers({
        countryOfOrigin: 'ZZ',
        regionOfOriginCode: 'ZZ-123'
      })
    )
    expect(errors).toHaveProperty('countryOfOrigin')
  })

  test('Should surface a required region code that is now blank', async () => {
    const errors = await validateStoredAnswers(
      storedAnswers({
        regionOfOriginCodeRequirement: 'yes',
        regionOfOriginCode: ''
      })
    )
    expect(errors).toHaveProperty('regionOfOriginCodeSuffix')
  })

  test('Should surface an internal reference number that exceeds the length cap', async () => {
    const errors = await validateStoredAnswers(
      storedAnswers({ internalReferenceNumber: 'x'.repeat(60) })
    )
    expect(errors).toHaveProperty('internalReferenceNumber')
  })

  // Cross-field cascade check: when the stored country and the stored
  // regionOfOriginCode's prefix disagree (e.g. country was changed to DE but
  // regionOfOriginCode is still AT-123), the suffix projection returns the
  // whole "AT-123" string, which then fails the 5-char cap.
  test('Should surface a stored region code whose prefix no longer matches the stored country', async () => {
    const errors = await validateStoredAnswers(
      storedAnswers({
        countryOfOrigin: 'DE',
        regionOfOriginCode: 'AT-123'
      })
    )
    expect(errors).toHaveProperty('regionOfOriginCodeSuffix')
  })

  // Round-trip: for any valid form values, answersFrom -> formValuesFromAnswers
  // must return the same form values. Guards the split-then-join cascade
  // against a projection bug that would leave the hook validating something
  // the POST handler wouldn't have.
  test('Should round-trip form values through answersFrom -> formValuesFromAnswers', () => {
    const formValues = {
      countryOfOrigin: VALID_COUNTRY,
      regionOfOriginCodeRequirement: 'yes',
      regionOfOriginCodeSuffix: '123',
      internalReferenceNumber: 'REF-1'
    }
    expect(formValuesFromAnswers(answersFrom(formValues))).toEqual(formValues)
  })
})
