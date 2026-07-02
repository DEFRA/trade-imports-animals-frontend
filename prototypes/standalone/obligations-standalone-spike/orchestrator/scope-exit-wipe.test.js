import { describe, it, expect } from 'vitest'
import { reconcileDerived, wipeOutOfScope } from './scope-exit-wipe.js'

const state = (overrides = {}) => ({
  'id-claim-type': { name: 'claimType', inScope: false },
  'id-full-name': { name: 'fullName', inScope: true },
  ...overrides
})

/** Non-car fixture (generality rail): a menu controlling derived courses. */
const obligations = [
  { id: 'id-menu', name: 'menu', type: 'multi-select', cardinality: 'single' },
  {
    id: 'id-starter',
    name: 'starterChoice',
    type: 'text',
    cardinality: 'indexed',
    indexedBy: {
      source: 'derived',
      controllingObligation: 'id-menu',
      controllingValue: 'starter',
      mutability: 'edit-only'
    }
  },
  {
    id: 'id-claim-type',
    name: 'claimType',
    type: 'radio',
    cardinality: 'indexed',
    indexedBy: { source: 'user', mutability: 'edit-add-remove' }
  }
]

describe('orchestrator/scope-exit-wipe — whole-obligation wipe', () => {
  it('actively deletes stored data whose obligation left scope, as data', () => {
    const stored = {
      'id-claim-type': { 'f-1': { value: 'theft' } },
      'id-full-name': { value: 'Alex Driver' }
    }
    const { fulfilments, wiped } = wipeOutOfScope(state(), stored)
    expect(fulfilments).toEqual({ 'id-full-name': { value: 'Alex Driver' } })
    expect(wiped).toEqual([
      { obligationId: 'id-claim-type', name: 'claimType' }
    ])
    expect(stored['id-claim-type']).toEqual({ 'f-1': { value: 'theft' } })
  })

  it('leaves entries the evaluation does not cover and wipes nothing in scope', () => {
    const stored = { 'id-unknown': { value: 'kept' } }
    expect(wipeOutOfScope(state(), stored)).toEqual({
      fulfilments: stored,
      wiped: []
    })
  })
})

describe('orchestrator/scope-exit-wipe — derived lifecycle reconciliation', () => {
  it('spawns a blank fulfilment keyed by the controlling value on selection', () => {
    const { fulfilments, spawned } = reconcileDerived(obligations, {
      'id-menu': { value: ['starter'] }
    })
    expect(fulfilments['id-starter']).toEqual({ starter: { value: '' } })
    expect(spawned).toEqual([
      {
        obligationId: 'id-starter',
        name: 'starterChoice',
        fulfilmentId: 'starter'
      }
    ])
  })

  it('leaves an already-spawned fulfilment and its data alone while selected', () => {
    const stored = {
      'id-menu': { value: ['starter'] },
      'id-starter': { starter: { value: 'soup' } }
    }
    expect(reconcileDerived(obligations, stored)).toEqual({
      fulfilments: stored,
      spawned: [],
      dropped: []
    })
  })

  it('drops and wipes on deselection — the data is gone, not hidden', () => {
    const { fulfilments, dropped } = reconcileDerived(obligations, {
      'id-menu': { value: [] },
      'id-starter': { starter: { value: 'soup' } }
    })
    expect(fulfilments['id-starter']).toBeUndefined()
    expect(dropped).toEqual([
      {
        obligationId: 'id-starter',
        name: 'starterChoice',
        fulfilmentId: 'starter'
      }
    ])
  })

  it('drops stale keys that are not the controlling value', () => {
    const { fulfilments } = reconcileDerived(obligations, {
      'id-menu': { value: ['starter'] },
      'id-starter': { stale: { value: 'old' }, starter: { value: 'soup' } }
    })
    expect(fulfilments['id-starter']).toEqual({ starter: { value: 'soup' } })
  })

  it('Yes-No-Yes cannot rehydrate: a re-select spawns FRESH blank', () => {
    const selected = reconcileDerived(obligations, {
      'id-menu': { value: ['starter'] },
      'id-starter': { starter: { value: 'soup' } }
    })
    const deselected = reconcileDerived(obligations, {
      ...selected.fulfilments,
      'id-menu': { value: [] }
    })
    const reselected = reconcileDerived(obligations, {
      ...deselected.fulfilments,
      'id-menu': { value: ['starter'] }
    })
    expect(reselected.fulfilments['id-starter']).toEqual({
      starter: { value: '' }
    })
  })

  it('supports scalar controllers via value equality', () => {
    const scalar = structuredClone(obligations)
    scalar[1].indexedBy.controllingValue = 'yes'
    const { fulfilments } = reconcileDerived(scalar, {
      'id-menu': { value: 'yes' }
    })
    expect(fulfilments['id-starter']).toEqual({ yes: { value: '' } })
  })

  it('is pure on inputs', () => {
    const stored = { 'id-menu': { value: ['starter'] } }
    reconcileDerived(obligations, stored)
    expect(stored).toEqual({ 'id-menu': { value: ['starter'] } })
  })
})
