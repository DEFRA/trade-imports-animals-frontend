import { describe, it, expect } from 'vitest'

import {
  optionsFor,
  validate,
  pageStatus,
  containerStatus,
  journeyState,
  firstApplicablePage,
  firstUnfulfilledPage,
  firstPagePresentingObligation,
  expandPresents,
  STATUSES
} from './index.js'

// ---------------------------------------------------------------------------
// Synthetic obligations + domain — the whole point is that the runtime
// primitives can be exercised in isolation, without the parent obligations
// manifest or evaluator. Same style as helpers.test.js next door.
// ---------------------------------------------------------------------------

const reasonOb = { id: 'reason', name: 'reason' }
const purposeOb = { id: 'purpose', name: 'purpose' }
const lineGroup = { id: 'line-group', name: 'lineGroup' }
const numOb = { id: 'num', name: 'num', within: lineGroup }
const speciesOb = { id: 'species', name: 'species', within: lineGroup }
const lookupOb = { id: 'lookup', name: 'lookup' }
const certifiedForOb = { id: 'certifiedFor', name: 'certifiedFor' }

const domain = new Map([
  [reasonOb.id, { type: 'enum', options: () => ['a', 'b', 'c'] }],
  [
    purposeOb.id,
    {
      type: 'enum',
      options: (f) => (f[reasonOb.id] === 'a' ? ['p1', 'p2'] : [])
    }
  ],
  [
    numOb.id,
    {
      type: 'integer',
      predicate: (value, ctx) => {
        if (!Number.isInteger(value) || value < 1) return [{ code: 'min' }]
        const s = ctx.siblingValue(speciesOb) ?? []
        if (s.includes('elephant') && value !== 1) return [{ code: 'elephant' }]
        return []
      },
      reasons: []
    }
  ],
  [certifiedForOb.id, { type: 'enum', options: (f) => f[lookupOb.id] ?? [] }]
])

// Convenience: build a state as the ObligationEvaluator would.
function state({ fulfilments = {}, obligations = {} } = {}) {
  return { fulfilments, obligations }
}

// ---------------------------------------------------------------------------
// optionsFor
// ---------------------------------------------------------------------------

describe('optionsFor', () => {
  it('returns static options', () => {
    expect(optionsFor(reasonOb, {}, new Map(), domain)).toEqual(['a', 'b', 'c'])
  })

  it('resolves computed options from state', () => {
    expect(
      optionsFor(purposeOb, { [reasonOb.id]: 'a' }, new Map(), domain)
    ).toEqual(['p1', 'p2'])
    expect(
      optionsFor(purposeOb, { [reasonOb.id]: 'b' }, new Map(), domain)
    ).toEqual([])
  })

  it('resolves lookup-driven options', () => {
    expect(
      optionsFor(certifiedForOb, { [lookupOb.id]: ['x'] }, new Map(), domain)
    ).toEqual(['x'])
    expect(optionsFor(certifiedForOb, {}, new Map(), domain)).toEqual([])
  })

  it('returns [] for an obligation with no domain entry', () => {
    expect(optionsFor({ id: 'unknown' }, {}, new Map(), domain)).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// validate
// ---------------------------------------------------------------------------

describe('validate — enum', () => {
  it('passes a legal value', () => {
    expect(validate(reasonOb, 'a', {}, domain)).toEqual([])
  })

  it('rejects a value not in options', () => {
    const errs = validate(reasonOb, 'zzz', {}, domain)
    expect(errs).toHaveLength(1)
    expect(errs[0].code).toBe('domain.enum.notInOptions')
    expect(errs[0].invalid).toEqual(['zzz'])
    expect(errs[0].options).toEqual(['a', 'b', 'c'])
  })

  it('handles multi-select — array value', () => {
    expect(validate(reasonOb, ['a', 'b'], {}, domain)).toEqual([])
    const errs = validate(reasonOb, ['a', 'zzz'], {}, domain)
    expect(errs[0].invalid).toEqual(['zzz'])
  })

  it('passes when value is unset (undefined / null / empty string)', () => {
    expect(validate(reasonOb, undefined, {}, domain)).toEqual([])
    expect(validate(reasonOb, null, {}, domain)).toEqual([])
    expect(validate(reasonOb, '', {}, domain)).toEqual([])
  })
})

describe('validate — predicate + siblingValue', () => {
  it('passes with valid value', () => {
    expect(
      validate(numOb, 5, { [speciesOb.id]: { line1: ['cattle'] } }, domain, {
        path: 'line1'
      })
    ).toEqual([])
  })

  it('rejects invalid via predicate min', () => {
    expect(validate(numOb, 0, {}, domain, { path: 'line1' })[0].code).toBe(
      'min'
    )
  })

  it('resolves siblings scoped by path', () => {
    const errs = validate(
      numOb,
      5,
      { [speciesOb.id]: { line1: ['elephant'] } },
      domain,
      { path: 'line1' }
    )
    expect(errs).toEqual([{ code: 'elephant' }])
  })

  it('does not cross-contaminate between lines', () => {
    // line2 has cattle; the elephant on line1 must not affect line2's num.
    expect(
      validate(
        numOb,
        20,
        {
          [speciesOb.id]: { line1: ['elephant'], line2: ['cattle'] }
        },
        domain,
        { path: 'line2' }
      )
    ).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// pageStatus + expandPresents
// ---------------------------------------------------------------------------

// Minimal implication builder: mimics what ObligationEvaluator returns
// for a given set of in-scope obligations + fulfilments.
function impls(entries) {
  const out = {}
  for (const e of entries) {
    out[e.obligation.id] = e.impl
  }
  return out
}

describe('expandPresents', () => {
  it('normalises static presents entries with defaults', () => {
    const page = {
      page: 'x',
      presents: [{ obligation: reasonOb }]
    }
    expect(expandPresents(page, state())).toEqual([
      {
        obligation: reasonOb,
        path: null,
        mandatoryToSaveAndContinue: false,
        errors: null
      }
    ])
  })

  it('passes through mandatoryToSaveAndContinue + errors from a static entry', () => {
    // Flow-level submit-mandate. See flow.js §Presents entries.
    const page = {
      page: 'x',
      presents: [
        {
          obligation: reasonOb,
          mandatoryToSaveAndContinue: true,
          errors: { required: 'Choose a reason' }
        }
      ]
    }
    expect(expandPresents(page, state())).toEqual([
      {
        obligation: reasonOb,
        path: null,
        mandatoryToSaveAndContinue: true,
        errors: { required: 'Choose a reason' }
      }
    ])
  })

  it('expands presentsForEach across group records', () => {
    const page = {
      page: 'x',
      presentsForEach: {
        obligation: numOb,
        forEachOf: lineGroup
      }
    }
    const st = state({
      obligations: impls([
        {
          obligation: lineGroup,
          impl: {
            inScope: true,
            records: [{ fulfilmentId: 'line1' }, { fulfilmentId: 'line2' }]
          }
        }
      ])
    })
    expect(expandPresents(page, st)).toEqual([
      {
        obligation: numOb,
        path: 'line1',
        mandatoryToSaveAndContinue: false,
        errors: null
      },
      {
        obligation: numOb,
        path: 'line2',
        mandatoryToSaveAndContinue: false,
        errors: null
      }
    ])
  })
})

describe('pageStatus', () => {
  it('NA when no presents entries', () => {
    expect(pageStatus({ page: 'ro' }, state())).toBe(STATUSES.NOT_APPLICABLE)
  })

  it('NA when every present is out of scope', () => {
    const page = { page: 'x', presents: [{ obligation: reasonOb }] }
    const st = state({
      obligations: impls([{ obligation: reasonOb, impl: { inScope: false } }])
    })
    expect(pageStatus(page, st)).toBe(STATUSES.NOT_APPLICABLE)
  })

  it('NS when in-scope but nothing filled', () => {
    const page = { page: 'x', presents: [{ obligation: reasonOb }] }
    const st = state({
      obligations: impls([
        { obligation: reasonOb, impl: { inScope: true, status: 'mandatory' } }
      ])
    })
    expect(pageStatus(page, st)).toBe(STATUSES.NOT_STARTED)
  })

  it('F when in-scope mandatory is filled', () => {
    const page = { page: 'x', presents: [{ obligation: reasonOb }] }
    const st = state({
      fulfilments: { [reasonOb.id]: 'a' },
      obligations: impls([
        { obligation: reasonOb, impl: { inScope: true, status: 'mandatory' } }
      ])
    })
    expect(pageStatus(page, st)).toBe(STATUSES.FULFILLED)
  })

  it('IP when some but not all in-scope filled', () => {
    const page = {
      page: 'x',
      presents: [{ obligation: reasonOb }, { obligation: purposeOb }]
    }
    const st = state({
      fulfilments: { [reasonOb.id]: 'a' },
      obligations: impls([
        { obligation: reasonOb, impl: { inScope: true, status: 'mandatory' } },
        { obligation: purposeOb, impl: { inScope: true, status: 'mandatory' } }
      ])
    })
    expect(pageStatus(page, st)).toBe(STATUSES.IN_PROGRESS)
  })

  it('F when an in-scope optional is unfilled but every in-scope mandatory is filled', () => {
    const page = {
      page: 'x',
      presents: [{ obligation: reasonOb }, { obligation: purposeOb }]
    }
    const st = state({
      fulfilments: { [reasonOb.id]: 'a' },
      obligations: impls([
        { obligation: reasonOb, impl: { inScope: true, status: 'mandatory' } },
        { obligation: purposeOb, impl: { inScope: true, status: 'optional' } }
      ])
    })
    // Doc rule: F iff every in-scope MANDATORY presented is filled.
    // The unfilled optional does not block F.
    expect(pageStatus(page, st)).toBe(STATUSES.FULFILLED)
  })

  it('F when every in-scope entry is optional and none are filled (optional-only page)', () => {
    // Completion-mandate semantics: an in-scope-optional obligation
    // does not need to be fulfilled for the journey to complete, so a
    // page whose only in-scope entries are optional is F immediately.
    // Whether the user should visit such a page before we call it
    // Complete is a display-layer question, parked in NEXT.md.
    const page = {
      page: 'x',
      presents: [{ obligation: reasonOb }, { obligation: purposeOb }]
    }
    const st = state({
      obligations: impls([
        { obligation: reasonOb, impl: { inScope: true, status: 'optional' } },
        { obligation: purposeOb, impl: { inScope: true, status: 'optional' } }
      ])
    })
    expect(pageStatus(page, st)).toBe(STATUSES.FULFILLED)
  })

  it('handles presentsForEach with a path-scoped fulfilment', () => {
    const page = {
      page: 'x',
      presentsForEach: {
        obligation: numOb,
        forEachOf: lineGroup,
        mandate: 'hard'
      }
    }
    const st = state({
      fulfilments: { [numOb.id]: { line1: 3 } },
      obligations: impls([
        {
          obligation: lineGroup,
          impl: {
            inScope: true,
            records: [{ fulfilmentId: 'line1' }]
          }
        },
        {
          obligation: numOb,
          impl: {
            inScope: true,
            records: [{ fulfilmentId: 'line1', status: 'mandatory' }]
          }
        }
      ])
    })
    expect(pageStatus(page, st)).toBe(STATUSES.FULFILLED)
  })
})

// ---------------------------------------------------------------------------
// containerStatus + journeyState
// ---------------------------------------------------------------------------

describe('containerStatus', () => {
  const filledPage = {
    page: 'a',
    presents: [{ obligation: reasonOb }]
  }
  const emptyPage = {
    page: 'b',
    presents: [{ obligation: purposeOb }]
  }
  const stFilled = state({
    fulfilments: { [reasonOb.id]: 'a' },
    obligations: impls([
      { obligation: reasonOb, impl: { inScope: true, status: 'mandatory' } },
      { obligation: purposeOb, impl: { inScope: true, status: 'mandatory' } }
    ])
  })

  it('rolls up F when all children F', () => {
    expect(
      containerStatus(
        { children: [filledPage] },
        state({
          fulfilments: { [reasonOb.id]: 'a' },
          obligations: impls([
            {
              obligation: reasonOb,
              impl: { inScope: true, status: 'mandatory' }
            }
          ])
        })
      )
    ).toBe(STATUSES.FULFILLED)
  })

  it('rolls up IP when F mixed with NS', () => {
    expect(
      containerStatus({ children: [filledPage, emptyPage] }, stFilled)
    ).toBe(STATUSES.IN_PROGRESS)
  })

  it('rolls up NA when every child NA', () => {
    expect(
      containerStatus(
        { children: [{ page: 'ro-1' }, { page: 'ro-2' }] },
        state()
      )
    ).toBe(STATUSES.NOT_APPLICABLE)
  })

  it('rolls up F when every child page is optional-only and none are filled', () => {
    // Subsection-level restatement of the pageStatus rule: if every
    // in-scope entry under the subsection is completion-optional,
    // the subsection is F without the user having touched anything.
    const optionalPage = {
      page: 'opt',
      presents: [{ obligation: reasonOb }]
    }
    const stOptionalOnly = state({
      obligations: impls([
        { obligation: reasonOb, impl: { inScope: true, status: 'optional' } }
      ])
    })
    expect(containerStatus({ children: [optionalPage] }, stOptionalOnly)).toBe(
      STATUSES.FULFILLED
    )
  })
})

describe('journeyState', () => {
  const readyState = state({
    fulfilments: { [reasonOb.id]: 'a' },
    obligations: impls([
      { obligation: reasonOb, impl: { inScope: true, status: 'mandatory' } }
    ])
  })
  const readyFlow = {
    sections: [
      { children: [{ page: 'a', presents: [{ obligation: reasonOb }] }] }
    ]
  }

  it('short-circuits to submitted', () => {
    expect(journeyState(readyFlow, readyState, true)).toBe(STATUSES.SUBMITTED)
  })

  it('reports fulfilled when every section F', () => {
    expect(journeyState(readyFlow, readyState)).toBe(STATUSES.FULFILLED)
  })

  it('reports NS on empty state', () => {
    expect(
      journeyState(
        readyFlow,
        state({
          obligations: impls([
            {
              obligation: reasonOb,
              impl: { inScope: true, status: 'mandatory' }
            }
          ])
        })
      )
    ).toBe(STATUSES.NOT_STARTED)
  })
})

// ---------------------------------------------------------------------------
// Navigation primitives
// ---------------------------------------------------------------------------

const linearFlow = {
  sections: [
    {
      children: [
        { page: 'intro' /* read-only NA */ },
        { page: 'a', presents: [{ obligation: reasonOb }] },
        { page: 'b', presents: [{ obligation: purposeOb }] }
      ]
    },
    {
      children: [
        {
          children: [{ page: 'c', presents: [{ obligation: certifiedForOb }] }]
        }
      ]
    }
  ]
}

describe('firstApplicablePage', () => {
  it('depth-firsts to the first page including NA read-only pages', () => {
    expect(firstApplicablePage(linearFlow.sections[0]).page).toBe('intro')
  })

  it('recurses into subsections', () => {
    expect(firstApplicablePage(linearFlow.sections[1]).page).toBe('c')
  })

  it('returns null for empty container', () => {
    expect(firstApplicablePage({ children: [] })).toBeNull()
  })
})

describe('firstUnfulfilledPage', () => {
  it('skips NA and F pages', () => {
    const st = state({
      fulfilments: { [reasonOb.id]: 'a' },
      obligations: impls([
        { obligation: reasonOb, impl: { inScope: true, status: 'mandatory' } },
        { obligation: purposeOb, impl: { inScope: true, status: 'mandatory' } }
      ])
    })
    expect(firstUnfulfilledPage(linearFlow.sections[0], st).page).toBe('b')
  })

  it('returns null when every page is F', () => {
    const st = state({
      fulfilments: {
        [reasonOb.id]: 'a',
        [purposeOb.id]: 'p1'
      },
      obligations: impls([
        { obligation: reasonOb, impl: { inScope: true, status: 'mandatory' } },
        { obligation: purposeOb, impl: { inScope: true, status: 'mandatory' } }
      ])
    })
    expect(firstUnfulfilledPage(linearFlow.sections[0], st)).toBeNull()
  })

  it('equals firstApplicablePage on empty state (skipping NA)', () => {
    const st = state({
      obligations: impls([
        { obligation: reasonOb, impl: { inScope: true, status: 'mandatory' } },
        { obligation: purposeOb, impl: { inScope: true, status: 'mandatory' } }
      ])
    })
    // Section has intro (NA) → a (NS) → b (NS). Unfulfilled finds 'a'.
    // Applicable is status-blind so it returns 'intro'. They intentionally
    // differ; documented in obligations.md §Primitive tests.
    expect(firstUnfulfilledPage(linearFlow.sections[0], st).page).toBe('a')
    expect(firstApplicablePage(linearFlow.sections[0]).page).toBe('intro')
  })
})

describe('firstPagePresentingObligation', () => {
  it('finds the first page in depth-first order', () => {
    expect(firstPagePresentingObligation(linearFlow, reasonOb.id).page).toBe(
      'a'
    )
  })

  it('finds deeply nested matches', () => {
    expect(
      firstPagePresentingObligation(linearFlow, certifiedForOb.id).page
    ).toBe('c')
  })

  it('returns null when nothing presents the obligation', () => {
    expect(firstPagePresentingObligation(linearFlow, 'missing')).toBeNull()
  })
})
