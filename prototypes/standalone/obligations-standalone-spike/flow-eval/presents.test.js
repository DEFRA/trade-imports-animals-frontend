import { describe, it, expect } from 'vitest'
import { expandSlots, isReadOnly, presentedObligations } from './presents.js'

/**
 * Fixtures are hand-built ObligationEvaluator output over a NON
 * car-insurance journey (an allotment permit — the generality rail,
 * OPEN1-X2_1): flow-eval must not care what the obligations mean.
 */
const obligationEntry = (name, overrides = {}) => [
  name,
  {
    name,
    inScope: true,
    status: 'optional',
    reasons: [],
    fulfilled: false,
    ...overrides
  }
]

const evaluationOf = (entries, fulfilments = {}) => ({
  obligations: Object.fromEntries(entries),
  fulfilments,
  drops: []
})

const evaluation = evaluationOf(
  [
    obligationEntry('applicantName', { status: 'mandatory', fulfilled: true }),
    obligationEntry('contactEmail'),
    obligationEntry('sheddingConsent', { inScope: false, status: undefined }),
    obligationEntry('hiveLocation', {
      status: 'mandatory',
      fulfilled: false,
      fulfilments: [
        { fulfilmentId: 'h1', fulfilled: true },
        { fulfilmentId: 'h2', fulfilled: false }
      ]
    }),
    obligationEntry('hiveCount', {
      fulfilments: [
        { fulfilmentId: 'h1', fulfilled: false },
        { fulfilmentId: 'h2', fulfilled: true }
      ]
    }),
    obligationEntry('toolList', { fulfilments: [] })
  ],
  {
    applicantName: { value: 'Ada Lovelace' },
    hiveLocation: { h1: { value: 'north corner' }, h2: { value: '' } },
    hiveCount: { h2: { value: '3' } }
  }
)

describe('flow-eval/presents — isReadOnly', () => {
  it('is intrinsic: no presents and no presentsForEach', () => {
    expect(isReadOnly({ kind: 'page', id: 'intro' })).toBe(true)
    expect(
      isReadOnly({
        kind: 'page',
        id: 'intro',
        presents: [],
        presentsForEach: []
      })
    ).toBe(true)
  })

  it('is false as soon as the page declares either entry list', () => {
    expect(
      isReadOnly({
        kind: 'page',
        id: 'p',
        presents: [{ obligation: 'applicantName' }]
      })
    ).toBe(false)
    expect(
      isReadOnly({
        kind: 'page',
        id: 'p',
        presentsForEach: [{ obligation: 'hiveLocation', fulfilment: '*' }]
      })
    ).toBe(false)
  })
})

describe('flow-eval/presents — presentedObligations', () => {
  it('pairs each declared entry with its evaluated obligation', () => {
    const page = {
      kind: 'page',
      id: 'applicant',
      presents: [{ obligation: 'applicantName', mandate: 'hard' }],
      presentsForEach: [{ obligation: 'hiveLocation', fulfilment: '*' }]
    }
    const presented = presentedObligations(page, evaluation)
    expect(presented).toHaveLength(2)
    expect(presented[0].entry.mandate).toBe('hard')
    expect(presented[0].obligation.name).toBe('applicantName')
    expect(presented[1].obligation.fulfilments).toHaveLength(2)
  })

  it('throws on an obligation id the evaluation does not know', () => {
    const page = { kind: 'page', id: 'p', presents: [{ obligation: 'ghost' }] }
    expect(() => presentedObligations(page, evaluation)).toThrow(
      'unknown obligation "ghost"'
    )
  })
})

describe('flow-eval/presents — expandSlots', () => {
  it('expands presents entries to single slots, flags copied verbatim', () => {
    const page = {
      kind: 'page',
      id: 'applicant',
      presents: [
        { obligation: 'applicantName', mandate: 'hard', label: 'Full name' },
        { obligation: 'contactEmail' },
        { obligation: 'sheddingConsent' }
      ]
    }
    const [name, email, consent] = expandSlots(page, evaluation)
    expect(name).toMatchObject({
      obligationId: 'applicantName',
      name: 'applicantName',
      fulfilmentId: null,
      pageMandate: 'hard',
      engineStatus: 'mandatory',
      inScope: true,
      fulfilled: true,
      value: 'Ada Lovelace'
    })
    expect(name.entry.label).toBe('Full name')
    expect(email).toMatchObject({
      pageMandate: 'soft',
      engineStatus: 'optional',
      fulfilled: false,
      value: undefined
    })
    expect(consent).toMatchObject({
      inScope: false,
      engineStatus: undefined,
      fulfilled: false
    })
  })

  it('expands presentsForEach per evaluation fulfilment, entry-major order', () => {
    const page = {
      kind: 'page',
      id: 'hives',
      presentsForEach: [
        { obligation: 'hiveLocation', fulfilment: '*' },
        { obligation: 'hiveCount', fulfilment: '*' }
      ]
    }
    const slots = expandSlots(page, evaluation)
    expect(
      slots.map(
        ({ obligationId, fulfilmentId }) => `${obligationId}/${fulfilmentId}`
      )
    ).toEqual([
      'hiveLocation/h1',
      'hiveLocation/h2',
      'hiveCount/h1',
      'hiveCount/h2'
    ])
    expect(slots.map((slot) => slot.fulfilled)).toEqual([
      true,
      false,
      false,
      true
    ])
    expect(slots.map((slot) => slot.value)).toEqual([
      'north corner',
      '',
      undefined,
      '3'
    ])
  })

  it('expands zero fulfilments to zero slots (the dynamically-empty case)', () => {
    const page = {
      kind: 'page',
      id: 'tools',
      presentsForEach: [{ obligation: 'toolList', fulfilment: '*' }]
    }
    expect(expandSlots(page, evaluation)).toEqual([])
  })

  it('orders a mixed page presents-first, then presentsForEach', () => {
    const page = {
      kind: 'page',
      id: 'mixed',
      presents: [{ obligation: 'contactEmail' }],
      presentsForEach: [{ obligation: 'hiveLocation', fulfilment: '*' }]
    }
    expect(
      expandSlots(page, evaluation).map((slot) => slot.obligationId)
    ).toEqual(['contactEmail', 'hiveLocation', 'hiveLocation'])
  })
})
