import { describe, expect, test } from 'vitest'

import { validateStoredAnswers } from './validate-stored.js'

const ctxWith = (entries) => ({ addressStatuses: new Map(entries) })

describe('#validateStoredAnswers for addresses', () => {
  test('Should return no errors when no party has been picked yet', async () => {
    expect(await validateStoredAnswers({}, ctxWith([]))).toEqual({})
  })

  test('Should return no errors when every stored addressId still resolves', async () => {
    const answers = {
      consignor: { addressId: 'record-a' },
      consignee: { addressId: 'record-b' },
      importer: { addressId: 'record-c' },
      placeOfOrigin: { addressId: 'record-d' },
      placeOfDestination: { addressId: 'record-e' }
    }
    const ctx = ctxWith([
      ['record-a', true],
      ['record-b', true],
      ['record-c', true],
      ['record-d', true],
      ['record-e', true]
    ])

    expect(await validateStoredAnswers(answers, ctx)).toEqual({})
  })

  test('Should surface exactly the roles whose addressId no longer resolves', async () => {
    const answers = {
      consignor: { addressId: 'record-a' },
      consignee: { addressId: 'record-b' },
      importer: { addressId: 'record-c' }
    }
    const ctx = ctxWith([
      ['record-a', false],
      ['record-b', true],
      ['record-c', false]
    ])

    const errors = await validateStoredAnswers(answers, ctx)

    expect(errors).toHaveProperty('consignor')
    expect(errors).toHaveProperty('importer')
    expect(errors).not.toHaveProperty('consignee')
  })

  test('Should not flag a party the trader never picked', async () => {
    const answers = { consignor: { addressId: 'record-a' } }
    const ctx = ctxWith([['record-a', true]])

    const errors = await validateStoredAnswers(answers, ctx)

    expect(errors).not.toHaveProperty('placeOfOrigin')
    expect(errors).not.toHaveProperty('consignee')
    expect(errors).not.toHaveProperty('importer')
    expect(errors).not.toHaveProperty('placeOfDestination')
  })

  test('Should carry the per-role message that outstandingPartyErrors used today', async () => {
    const answers = { consignor: { addressId: 'record-a' } }
    const ctx = ctxWith([['record-a', false]])

    const errors = await validateStoredAnswers(answers, ctx)

    expect(errors.consignor).toBe('Select an address for the consignor')
  })
})
