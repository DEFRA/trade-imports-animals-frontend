import { describe, expect, test } from 'vitest'

import { validateStoredAnswers } from './validate-stored.js'

describe('#validateStoredAnswers for cph-number', () => {
  test('Should return no errors when the trader has not saved a CPH number', async () => {
    expect(await validateStoredAnswers({})).toEqual({})
  })

  test('Should return no errors when the stored nine digits parse into three valid parts', async () => {
    expect(
      await validateStoredAnswers({ countyParishHoldingCph: '123456789' })
    ).toEqual({})
  })

  test('Should tolerate legacy slashes in the stored value', async () => {
    expect(
      await validateStoredAnswers({ countyParishHoldingCph: '12/345/6789' })
    ).toEqual({})
  })

  test('Should surface a stored value that is too short to fill every part', async () => {
    const errors = await validateStoredAnswers({
      countyParishHoldingCph: '12345'
    })
    expect(Object.keys(errors).length).toBeGreaterThan(0)
  })

  test('Should surface a stored value that carries non-digit characters', async () => {
    const errors = await validateStoredAnswers({
      countyParishHoldingCph: '12ABC6789'
    })
    expect(Object.keys(errors).length).toBeGreaterThan(0)
  })
})
