import { describe, it, expect } from 'vitest'
import { addFulfilment, removeFulfilment } from './indexed-collection.js'
import { obligations } from './test-fixtures.js'

describe('orchestrator/apply-answers — the claims add/remove lifecycle', () => {
  it('mints ONE shared id across sibling obligations and canonicalises values', () => {
    const { fulfilments, fulfilmentId } = addFulfilment(
      obligations,
      {},
      ['claimType', 'claimAmount'],
      { claimType: 'theft', claimAmount: '£1,200' }
    )
    expect(fulfilmentId).toMatch(/^f-/)
    expect(fulfilments['id-claim-type']).toEqual({
      [fulfilmentId]: { value: 'theft' }
    })
    expect(fulfilments['id-claim-amount']).toEqual({
      [fulfilmentId]: { value: '1200' }
    })
  })

  it('stores blank for unanswered obligations — a typeless claim still counts', () => {
    const { fulfilments, fulfilmentId } = addFulfilment(
      obligations,
      {},
      ['claimType', 'claimAmount'],
      {}
    )
    expect(fulfilments['id-claim-type'][fulfilmentId]).toEqual({ value: '' })
    expect(fulfilments['id-claim-amount'][fulfilmentId]).toEqual({ value: '' })
  })

  it('rejects minting for anything but user-source indexed obligations', () => {
    expect(() => addFulfilment(obligations, {}, ['fullName'])).toThrow(
      /not a user-source indexed/
    )
  })

  it('removes one row by shared id from every sibling, leaving the rest', () => {
    const seeded = {
      'id-claim-type': { 'f-1': { value: 'theft' }, 'f-2': { value: 'fire' } },
      'id-claim-amount': { 'f-1': { value: '100' }, 'f-2': { value: '200' } }
    }
    const next = removeFulfilment(
      obligations,
      seeded,
      ['claimType', 'claimAmount'],
      'f-1'
    )
    expect(next['id-claim-type']).toEqual({ 'f-2': { value: 'fire' } })
    expect(next['id-claim-amount']).toEqual({ 'f-2': { value: '200' } })
    expect(seeded['id-claim-type']['f-1']).toEqual({ value: 'theft' })
  })

  it('tolerates removing from an obligation with no stored rows', () => {
    expect(
      removeFulfilment(obligations, {}, ['claimType', 'claimAmount'], 'f-1')
    ).toEqual({})
  })
})
