import { describe, expect, test } from 'vitest'

import { validateStoredAnswers } from './validate-stored.js'

const ctxWith = (entries) => ({ addressStatuses: new Map(entries) })

describe('#validateStoredAnswers for contact', () => {
  test('Should return no errors when the trader has not picked a contact address', async () => {
    expect(await validateStoredAnswers({}, ctxWith([]))).toEqual({})
  })

  test('Should return no errors when the stored addressId still resolves', async () => {
    const answers = { contactAddress: { addressId: 'record-7' } }

    expect(
      await validateStoredAnswers(answers, ctxWith([['record-7', true]]))
    ).toEqual({})
  })

  test('Should surface an addressId the organisation can no longer see', async () => {
    const answers = { contactAddress: { addressId: 'record-7' } }

    expect(
      await validateStoredAnswers(answers, ctxWith([['record-7', false]]))
    ).toHaveProperty('contactAddress')
  })

  test('Should surface an addressId missing from the status map', async () => {
    const answers = { contactAddress: { addressId: 'record-9' } }

    expect(
      await validateStoredAnswers(answers, ctxWith([['record-7', true]]))
    ).toHaveProperty('contactAddress')
  })
})
