import { describe, it, expect } from 'vitest'
import {
  MANDATE_COMPOSITION,
  composeMandate,
  blocksSave,
  unfulfilledMandatory,
  COMPLETION_POLICIES,
  JOURNEY_COMPLETION_POLICY,
  resolveCompletionPolicy
} from './mandates.js'

describe('engine/mandates — the four-row composition table', () => {
  it('pins exactly the four doc rows, most restrictive first', () => {
    expect(
      MANDATE_COMPOSITION.map(
        ({ page, engine, blocksSave, blocksCompletion }) => [
          page,
          engine,
          blocksSave,
          blocksCompletion
        ]
      )
    ).toEqual([
      ['hard', 'mandatory', true, true],
      ['hard', 'optional', true, false],
      ['soft', 'mandatory', false, true],
      ['soft', 'optional', false, false]
    ])
  })

  it('defaults soft x optional (the omitted-mandate 90% case)', () => {
    expect(composeMandate()).toMatchObject({
      blocksSave: false,
      blocksCompletion: false
    })
    expect(composeMandate(undefined, 'mandatory').blocksCompletion).toBe(true)
  })

  it('throws on unknown mandate pairs', () => {
    expect(() => composeMandate('required', 'optional')).toThrow(
      'Unknown mandate pair'
    )
  })
})

describe('engine/mandates — blocksSave (the page-POST gate)', () => {
  const entry = (overrides) => ({
    inScope: true,
    status: 'mandatory',
    fulfilled: false,
    ...overrides
  })

  it('blocks only hard + in scope + unfulfilled', () => {
    expect(blocksSave('hard', entry())).toBe(true)
    expect(blocksSave('hard', entry({ status: 'optional' }))).toBe(true)
  })

  it('never blocks a soft entry — blank saves advance (Rulings item 3)', () => {
    expect(blocksSave('soft', entry())).toBe(false)
    expect(blocksSave(undefined, entry())).toBe(false)
  })

  it('never blocks fulfilled or out-of-scope obligations', () => {
    expect(blocksSave('hard', entry({ fulfilled: true }))).toBe(false)
    expect(blocksSave('hard', entry({ inScope: false }))).toBe(false)
  })
})

describe('engine/mandates — unfulfilledMandatory (the CYA-POST gate)', () => {
  it('lists in-scope mandatory unfulfilled obligations with their reasons', () => {
    const atLeastOne = { code: 'mandate.claimType.atLeastOne' }
    const evaluation = {
      obligations: {
        'id-full-name': {
          name: 'fullName',
          inScope: true,
          status: 'mandatory',
          fulfilled: true,
          reasons: [{ code: 'mandate.fullName.missing' }]
        },
        'id-claim-type': {
          name: 'claimType',
          inScope: true,
          status: 'mandatory',
          fulfilled: false,
          reasons: [atLeastOne],
          fulfilments: []
        },
        'id-phone': {
          name: 'phone',
          inScope: true,
          status: 'optional',
          fulfilled: false,
          reasons: []
        },
        'id-excess': {
          name: 'excessAmount',
          inScope: false,
          reasons: [],
          fulfilled: false
        }
      }
    }
    expect(unfulfilledMandatory(evaluation)).toEqual([
      {
        obligationId: 'id-claim-type',
        name: 'claimType',
        reasons: [atLeastOne]
      }
    ])
  })

  it('returns [] for a complete journey', () => {
    expect(unfulfilledMandatory({ obligations: {} })).toEqual([])
  })
})

describe('engine/mandates — completion policies', () => {
  it('pins the three doc modes and the journey default', () => {
    expect(COMPLETION_POLICIES).toEqual([
      'silently-skipped',
      'must-address',
      'gate-collected-at-end'
    ])
    expect(JOURNEY_COMPLETION_POLICY).toBe('gate-collected-at-end')
  })

  it('resolves per-obligation override over the journey default', () => {
    expect(resolveCompletionPolicy('gate-collected-at-end')).toBe(
      'gate-collected-at-end'
    )
    expect(
      resolveCompletionPolicy('gate-collected-at-end', 'must-address')
    ).toBe('must-address')
    expect(() => resolveCompletionPolicy('whenever')).toThrow(
      'Unknown completion policy "whenever"'
    )
  })
})
