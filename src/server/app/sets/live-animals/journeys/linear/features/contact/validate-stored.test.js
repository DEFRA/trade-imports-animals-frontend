import { describe, expect, test } from 'vitest'

import { validateStoredAnswers } from './validate-stored.js'

const RESOLVED_RECORD = { id: 'record-7', name: 'ACME Ltd', deleted: false }

const ctxWith = (entries) => ({
  addressResolutions: new Map(entries)
})

describe('#validateStoredAnswers for contact', () => {
  test('Should return no errors when the trader has not picked a contact address', async () => {
    expect(await validateStoredAnswers({}, ctxWith([]))).toEqual({})
  })

  test('Should return no errors when the stored addressId still resolves', async () => {
    const answers = { contactAddress: { addressId: 'record-7' } }

    expect(
      await validateStoredAnswers(
        answers,
        ctxWith([['record-7', RESOLVED_RECORD]])
      )
    ).toEqual({})
  })

  test('Should surface an addressId the organisation can no longer see', async () => {
    const answers = { contactAddress: { addressId: 'record-7' } }

    expect(
      await validateStoredAnswers(answers, ctxWith([['record-7', undefined]]))
    ).toHaveProperty('contactAddress')
  })

  test('Should surface a soft-deleted address the same as an unresolvable one', async () => {
    const answers = { contactAddress: { addressId: 'record-7' } }

    expect(
      await validateStoredAnswers(
        answers,
        ctxWith([['record-7', { ...RESOLVED_RECORD, deleted: true }]])
      )
    ).toHaveProperty('contactAddress')
  })

  test('Should surface an addressId missing from the resolutions map', async () => {
    const answers = { contactAddress: { addressId: 'record-9' } }

    expect(
      await validateStoredAnswers(
        answers,
        ctxWith([['record-7', RESOLVED_RECORD]])
      )
    ).toHaveProperty('contactAddress')
  })
})
