import { describe, it, expect } from 'vitest'
import { pruneFulfilments } from './prune.js'

const obligations = [
  { id: 'id-full-name', name: 'fullName', type: 'text', cardinality: 'single' },
  {
    id: 'id-claim-type',
    name: 'claimType',
    type: 'radio',
    cardinality: 'indexed',
    indexedBy: { source: 'user', mutability: 'edit-add-remove' }
  }
]

describe('engine/prune — reconcile-on-load', () => {
  it('passes through fulfilments that still map cleanly', () => {
    const stored = {
      'id-full-name': { value: 'Alex Driver' },
      'id-claim-type': { f1: { value: 'theft' }, f2: { value: null } }
    }
    const { fulfilments, drops } = pruneFulfilments(obligations, stored)
    expect(fulfilments).toEqual(stored)
    expect(drops).toEqual([])
  })

  it('silently drops fulfilments for obligations that no longer exist', () => {
    const { fulfilments, drops } = pruneFulfilments(obligations, {
      'id-removed': { value: 'stale' },
      'id-full-name': { value: 'Alex Driver' }
    })
    expect(fulfilments).toEqual({ 'id-full-name': { value: 'Alex Driver' } })
    expect(drops).toEqual([
      { obligationId: 'id-removed', reason: 'unknown-obligation' }
    ])
  })

  it('drops entries whose cardinality no longer fits, both directions', () => {
    const { fulfilments, drops } = pruneFulfilments(obligations, {
      'id-full-name': { f1: { value: 'was indexed' } },
      'id-claim-type': { value: 'was single' }
    })
    expect(fulfilments).toEqual({})
    expect(drops).toEqual([
      {
        obligationId: 'id-full-name',
        name: 'fullName',
        reason: 'cardinality-mismatch'
      },
      {
        obligationId: 'id-claim-type',
        name: 'claimType',
        reason: 'cardinality-mismatch'
      }
    ])
  })

  it('drops malformed indexed fulfilments individually, keeping the rest', () => {
    const { fulfilments, drops } = pruneFulfilments(obligations, {
      'id-claim-type': { f1: { value: 'theft' }, f2: 'bare-string' }
    })
    expect(fulfilments).toEqual({ 'id-claim-type': { f1: { value: 'theft' } } })
    expect(drops).toEqual([
      {
        obligationId: 'id-claim-type',
        name: 'claimType',
        fulfilmentId: 'f2',
        reason: 'malformed-fulfilment'
      }
    ])
  })

  it('is idempotent: pruning the amended set drops nothing', () => {
    const first = pruneFulfilments(obligations, {
      'id-removed': { value: 'stale' },
      'id-claim-type': { f1: { value: 'theft' }, f2: 'bad' }
    })
    const second = pruneFulfilments(obligations, first.fulfilments)
    expect(second.fulfilments).toEqual(first.fulfilments)
    expect(second.drops).toEqual([])
  })

  it('never mutates its input and returns deep copies', () => {
    const stored = { 'id-claim-type': { f1: { value: ['theft'] } } }
    const { fulfilments } = pruneFulfilments(obligations, stored)
    fulfilments['id-claim-type'].f1.value.push('mutated')
    expect(stored['id-claim-type'].f1.value).toEqual(['theft'])
  })

  it('treats missing fulfilments as an empty map', () => {
    expect(pruneFulfilments(obligations)).toEqual({
      fulfilments: {},
      drops: []
    })
  })
})
