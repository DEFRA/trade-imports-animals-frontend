import { describe, it, expect } from 'vitest'

import {
  optionsFor,
  validate,
  pageStatus,
  containerStatus,
  journeyState,
  firstApplicablePage,
  firstUnfulfilledPage,
  firstUnfulfilledPageForLine,
  firstUnfulfilledPageForUnit,
  firstPagePresentingObligation,
  groupInvariantErrors,
  groupInvariantErrorsForContainer,
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
        mandatoryToProceed: false,
        errors: null
      }
    ])
  })

  it('passes through mandatoryToProceed + errors from a static entry', () => {
    // Flow-level submit-mandate. See flow.js §Presents entries.
    const page = {
      page: 'x',
      presents: [
        {
          obligation: reasonOb,
          mandatoryToProceed: true,
          errors: { required: 'Choose a reason' }
        }
      ]
    }
    expect(expandPresents(page, state())).toEqual([
      {
        obligation: reasonOb,
        path: null,
        mandatoryToProceed: true,
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
        mandatoryToProceed: false,
        errors: null
      },
      {
        obligation: numOb,
        path: 'line2',
        mandatoryToProceed: false,
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

  it('Optional when every in-scope entry is optional and none are filled (optional-only page)', () => {
    // 5-way alphabet: an untouched optional-only page reads Optional,
    // not vacuously-F. Signals "there is opt-in room here" via the tag
    // without falsely claiming Completed. See classifyEntries in
    // engine/index.js — Case A "no mandatory in scope, nothing filled".
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
    expect(pageStatus(page, st)).toBe(STATUSES.OPTIONAL)
  })

  it('F when at least one optional is filled on an optional-only page (engagement flips Optional → Complete)', () => {
    // The moment the user fulfils any obligation on an optional-only
    // page, the page reads Complete. No "In progress" mid-state for
    // optional-only pages — engagement is the only signal we surface.
    const page = {
      page: 'x',
      presents: [{ obligation: reasonOb }, { obligation: purposeOb }]
    }
    const st = state({
      obligations: impls([
        { obligation: reasonOb, impl: { inScope: true, status: 'optional' } },
        { obligation: purposeOb, impl: { inScope: true, status: 'optional' } }
      ]),
      fulfilments: { [reasonOb.id]: 'internal-market' }
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

  // ---- hasFulfilment composite-blank regressions (Fix #7) ----

  it('singleton composite `{}` counts as NOT filled → NS (Fix #7 regression)', () => {
    // Previously hasFulfilment returned true iff
    // `Object.keys(stored).length > 0`, so `{}` was mis-classified as
    // filled and a mandatory singleton composite would roll up to F
    // instead of staying NS.
    const addrOb = { id: 'addr', name: 'addr' }
    const page = { page: 'x', presents: [{ obligation: addrOb }] }
    const st = state({
      fulfilments: { [addrOb.id]: {} },
      obligations: impls([
        { obligation: addrOb, impl: { inScope: true, status: 'mandatory' } }
      ])
    })
    expect(pageStatus(page, st)).toBe(STATUSES.NOT_STARTED)
  })

  it('singleton composite with all-blank sub-fields counts as NOT filled → NS (Fix #7 regression)', () => {
    const addrOb = { id: 'addr', name: 'addr' }
    const page = { page: 'x', presents: [{ obligation: addrOb }] }
    const st = state({
      fulfilments: {
        [addrOb.id]: { name: '', addressLine1: '', town: '', postcode: '' }
      },
      obligations: impls([
        { obligation: addrOb, impl: { inScope: true, status: 'mandatory' } }
      ])
    })
    expect(pageStatus(page, st)).toBe(STATUSES.NOT_STARTED)
  })

  it('per-line composite with all-blank sub-fields counts as NOT filled → NS (Fix #7 regression)', () => {
    // Same story for path-scoped fulfilments: the per-record catch-all
    // used to `return true` on any object, so an all-empty address
    // hanging off `line1` rolled up to F.
    const addrOb = { id: 'addr', name: 'addr', within: lineGroup }
    const page = {
      page: 'x',
      presentsForEach: { obligation: addrOb, forEachOf: lineGroup }
    }
    const st = state({
      fulfilments: {
        [addrOb.id]: {
          line1: { name: '', addressLine1: '', town: '', postcode: '' }
        }
      },
      obligations: impls([
        {
          obligation: lineGroup,
          impl: { inScope: true, records: [{ fulfilmentId: 'line1' }] }
        },
        {
          obligation: addrOb,
          impl: {
            inScope: true,
            records: [{ fulfilmentId: 'line1', status: 'mandatory' }]
          }
        }
      ])
    })
    expect(pageStatus(page, st)).toBe(STATUSES.NOT_STARTED)
  })

  it('singleton composite with one sub-field filled → F', () => {
    const addrOb = { id: 'addr', name: 'addr' }
    const page = { page: 'x', presents: [{ obligation: addrOb }] }
    const st = state({
      fulfilments: {
        [addrOb.id]: {
          name: '',
          addressLine1: '10 High St',
          town: '',
          postcode: ''
        }
      },
      obligations: impls([
        { obligation: addrOb, impl: { inScope: true, status: 'mandatory' } }
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

  it('rolls up Optional when every child page is optional-only and none are filled', () => {
    // Subsection-level restatement of the pageStatus rule: under the
    // 5-way alphabet, if every in-scope entry under the subsection is
    // completion-optional and none has been filled, the subsection
    // reads Optional — the user hasn't engaged, and the tag advertises
    // that (rather than falsely claiming Completed).
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
      STATUSES.OPTIONAL
    )
  })

  it('rolls up F when every child page is optional-only and at least one optional is filled', () => {
    // Case A engagement path: any fulfilment on a purely-optional
    // subsection flips it Optional → Complete. No mid "In progress"
    // state for optional-only subtrees.
    const optionalPage = {
      page: 'opt',
      presents: [{ obligation: reasonOb }]
    }
    const stEngaged = state({
      obligations: impls([
        { obligation: reasonOb, impl: { inScope: true, status: 'optional' } }
      ]),
      fulfilments: { [reasonOb.id]: 'internal-market' }
    })
    expect(containerStatus({ children: [optionalPage] }, stEngaged)).toBe(
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

describe('firstUnfulfilledPageForLine', () => {
  // Synthetic composite-value obligation — models an address block whose
  // stored value is `{ name, addressLine1, ... }`.
  const addrOb = { id: 'addr', name: 'addr', within: lineGroup }

  const makeContainer = () => ({
    children: [
      {
        page: 'addr-page',
        presentsForEach: { obligation: addrOb, forEachOf: lineGroup }
      }
    ]
  })

  const withRecord = () =>
    impls([
      {
        obligation: lineGroup,
        impl: { inScope: true, records: [{ fulfilmentId: 'line1' }] }
      },
      {
        obligation: addrOb,
        impl: {
          inScope: true,
          records: [{ fulfilmentId: 'line1', status: 'mandatory' }]
        }
      }
    ])

  it('returns the page when the line has no fulfilment yet', () => {
    const st = state({ obligations: withRecord() })
    expect(firstUnfulfilledPageForLine(makeContainer(), st, 'line1').page).toBe(
      'addr-page'
    )
  })

  it('returns the page when the composite is `{}` (Fix #6 regression)', () => {
    // Previously the inline blank-check was
    //   stored === undefined || null || '' || (Array && length === 0)
    // — an empty object slipped through as "filled", so
    // firstUnfulfilledPageForLine skipped past the address page and
    // callers would send the user to /lines instead of back to fill it.
    const st = state({
      fulfilments: { [addrOb.id]: { line1: {} } },
      obligations: withRecord()
    })
    expect(firstUnfulfilledPageForLine(makeContainer(), st, 'line1').page).toBe(
      'addr-page'
    )
  })

  it('returns the page when every sub-field of the composite is blank (Fix #6 regression)', () => {
    const st = state({
      fulfilments: {
        [addrOb.id]: {
          line1: { name: '', addressLine1: '', town: '', postcode: '' }
        }
      },
      obligations: withRecord()
    })
    expect(firstUnfulfilledPageForLine(makeContainer(), st, 'line1').page).toBe(
      'addr-page'
    )
  })

  it('returns null when at least one sub-field of the composite is filled', () => {
    const st = state({
      fulfilments: {
        [addrOb.id]: {
          line1: {
            name: '',
            addressLine1: '10 High St',
            town: '',
            postcode: ''
          }
        }
      },
      obligations: withRecord()
    })
    expect(firstUnfulfilledPageForLine(makeContainer(), st, 'line1')).toBeNull()
  })
})

describe('firstUnfulfilledPageForUnit', () => {
  // Depth-2 fan-out — unit records live under commodity lines with
  // composite keys `${lineId}/${unitId}`. Mirrors the shape used by
  // permanent-address / passport / ear-tag in the manifest.
  const unitRecord = { id: 'unit-group', name: 'unitRecord' }
  const addrOb = { id: 'permanent-address', name: 'permanentAddress' }

  const makeContainer = () => ({
    children: [
      {
        page: 'permanent-address',
        presentsForEach: { obligation: addrOb, forEachOf: unitRecord }
      }
    ]
  })

  const withRecord = () =>
    impls([
      {
        obligation: unitRecord,
        impl: { inScope: true, records: [{ fulfilmentId: 'line1/unit1' }] }
      },
      {
        obligation: addrOb,
        impl: {
          inScope: true,
          records: [{ fulfilmentId: 'line1/unit1', status: 'mandatory' }]
        }
      }
    ])

  it('returns the page when the unit has no fulfilment yet', () => {
    const st = state({ obligations: withRecord() })
    expect(
      firstUnfulfilledPageForUnit(makeContainer(), st, 'line1', 'unit1').page
    ).toBe('permanent-address')
  })

  it('returns null when the composite fulfilment is filled', () => {
    const st = state({
      fulfilments: {
        [addrOb.id]: { 'line1/unit1': { addressLine1: '10 High St' } }
      },
      obligations: withRecord()
    })
    expect(
      firstUnfulfilledPageForUnit(makeContainer(), st, 'line1', 'unit1')
    ).toBeNull()
  })

  it('returns the page when the composite fulfilment is all-blank', () => {
    // Same isBlankValue semantics as depth-1: `{}` and
    // `{ name: '' }` count as unfilled.
    const st = state({
      fulfilments: {
        [addrOb.id]: { 'line1/unit1': { name: '', addressLine1: '' } }
      },
      obligations: withRecord()
    })
    expect(
      firstUnfulfilledPageForUnit(makeContainer(), st, 'line1', 'unit1').page
    ).toBe('permanent-address')
  })

  it('scopes to the requested (line, unit) — does not cross to another unit', () => {
    // line1/unit1 is filled; line1/unit2 is unfilled. Asking about
    // unit1 returns null; asking about unit2 returns the page.
    const st = state({
      fulfilments: {
        [addrOb.id]: {
          'line1/unit1': { addressLine1: '10 High St' }
        }
      },
      obligations: impls([
        {
          obligation: unitRecord,
          impl: {
            inScope: true,
            records: [
              { fulfilmentId: 'line1/unit1' },
              { fulfilmentId: 'line1/unit2' }
            ]
          }
        },
        {
          obligation: addrOb,
          impl: {
            inScope: true,
            records: [
              { fulfilmentId: 'line1/unit1', status: 'mandatory' },
              { fulfilmentId: 'line1/unit2', status: 'mandatory' }
            ]
          }
        }
      ])
    })
    expect(
      firstUnfulfilledPageForUnit(makeContainer(), st, 'line1', 'unit1')
    ).toBeNull()
    expect(
      firstUnfulfilledPageForUnit(makeContainer(), st, 'line1', 'unit2').page
    ).toBe('permanent-address')
  })

  it('skips optional records', () => {
    const st = state({
      obligations: impls([
        {
          obligation: unitRecord,
          impl: { inScope: true, records: [{ fulfilmentId: 'line1/unit1' }] }
        },
        {
          obligation: addrOb,
          impl: {
            inScope: true,
            records: [{ fulfilmentId: 'line1/unit1', status: 'optional' }]
          }
        }
      ])
    })
    expect(
      firstUnfulfilledPageForUnit(makeContainer(), st, 'line1', 'unit1')
    ).toBeNull()
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

describe('groupInvariantErrors (V4 requires.anyOf)', () => {
  // Depth-2 fan-out — every unit-record must carry ≥ 1 identifier.
  // Mirrors the shape used by unitRecord.requires in obligations.js.
  const unitRecord = { id: 'unit-group', name: 'unitRecord' }
  const passport = { id: 'passport', name: 'passport' }
  const earTag = { id: 'ear-tag', name: 'earTag' }

  // Group carries the invariant.
  const groupWithRequires = {
    ...unitRecord,
    requires: {
      anyOfIds: [passport.id, earTag.id],
      errorCode: 'obligation.unitRecord.identifiersRequired'
    }
  }

  it('empty list when no group carries `requires`', () => {
    const groupNoRequires = { ...unitRecord }
    const st = state({
      obligations: impls([
        {
          obligation: unitRecord,
          impl: { inScope: true, records: [{ fulfilmentId: 'line1/unit1' }] }
        }
      ])
    })
    expect(groupInvariantErrors(groupNoRequires, st)).toEqual([])
  })

  it('empty list when the group is out of scope', () => {
    const st = state({
      obligations: impls([{ obligation: unitRecord, impl: { inScope: false } }])
    })
    expect(groupInvariantErrors(groupWithRequires, st)).toEqual([])
  })

  it('empty list when no `requires.anyOf` leaf is in scope for this instance', () => {
    // A unit whose commodity code opens NEITHER passport nor earTag
    // has nothing to satisfy; treat as vacuous. In practice iter 10's
    // catch-all (identificationDetails/description) makes this rare
    // but the check must be correct in isolation.
    const st = state({
      obligations: impls([
        {
          obligation: unitRecord,
          impl: { inScope: true, records: [{ fulfilmentId: 'line1/unit1' }] }
        },
        { obligation: passport, impl: { inScope: false } },
        { obligation: earTag, impl: { inScope: false } }
      ])
    })
    expect(groupInvariantErrors(groupWithRequires, st)).toEqual([])
  })

  it('one error per in-scope instance with all required leaves blank', () => {
    const st = state({
      // Two in-scope units on line1; neither has a passport or earTag
      // filled.
      obligations: impls([
        {
          obligation: unitRecord,
          impl: {
            inScope: true,
            records: [
              { fulfilmentId: 'line1/unit1' },
              { fulfilmentId: 'line1/unit2' }
            ]
          }
        },
        {
          obligation: passport,
          impl: {
            inScope: true,
            records: [
              { fulfilmentId: 'line1/unit1', status: 'optional' },
              { fulfilmentId: 'line1/unit2', status: 'optional' }
            ]
          }
        },
        {
          obligation: earTag,
          impl: {
            inScope: true,
            records: [
              { fulfilmentId: 'line1/unit1', status: 'optional' },
              { fulfilmentId: 'line1/unit2', status: 'optional' }
            ]
          }
        }
      ])
    })
    const errors = groupInvariantErrors(groupWithRequires, st)
    expect(errors).toHaveLength(2)
    expect(errors[0]).toEqual({
      code: 'obligation.unitRecord.identifiersRequired',
      groupId: unitRecord.id,
      groupName: 'unitRecord',
      instanceId: 'line1/unit1'
    })
    expect(errors[1].instanceId).toBe('line1/unit2')
  })

  it('no error when at least one required leaf is filled', () => {
    const st = state({
      fulfilments: { [passport.id]: { 'line1/unit1': 'PP-001' } },
      obligations: impls([
        {
          obligation: unitRecord,
          impl: { inScope: true, records: [{ fulfilmentId: 'line1/unit1' }] }
        },
        {
          obligation: passport,
          impl: {
            inScope: true,
            records: [{ fulfilmentId: 'line1/unit1', status: 'optional' }]
          }
        },
        {
          obligation: earTag,
          impl: {
            inScope: true,
            records: [{ fulfilmentId: 'line1/unit1', status: 'optional' }]
          }
        }
      ])
    })
    expect(groupInvariantErrors(groupWithRequires, st)).toEqual([])
  })

  it('treats an all-blank composite value as unfilled (uses isBlankValue)', () => {
    // Regression: a composite address record with all-empty
    // sub-fields must not "satisfy" the invariant.
    const st = state({
      fulfilments: {
        [passport.id]: {
          'line1/unit1': { name: '', addressLine1: '', town: '', postcode: '' }
        }
      },
      obligations: impls([
        {
          obligation: unitRecord,
          impl: { inScope: true, records: [{ fulfilmentId: 'line1/unit1' }] }
        },
        {
          obligation: passport,
          impl: {
            inScope: true,
            records: [{ fulfilmentId: 'line1/unit1', status: 'optional' }]
          }
        }
      ])
    })
    expect(groupInvariantErrors(groupWithRequires, st)).toHaveLength(1)
  })
})

describe('groupInvariantErrors — `requires.minEntries` collection floor', () => {
  // Fixes REPORT §7 "No minimum-instance floor" — a group carrying a
  // `minEntries` floor must emit one collection-scoped error when
  // records.length is below the floor, so containerStatus / journeyState
  // stop treating an empty collection as vacuously satisfied. Per the
  // MATRIX row "Minimum-instance floor" this is the ~8-LOC branch into
  // `groupInvariantErrors` from Winner A.
  //
  // The floor is orthogonal to `requires.anyOf` (the per-instance rule):
  // a group may carry either, both, or neither. Errors from the two
  // rules coexist in the same list; consumers count them uniformly.
  const commodityLineGroup = { id: 'commodity-line', name: 'commodityLine' }

  const groupWithFloor = {
    ...commodityLineGroup,
    requires: {
      minEntries: 1,
      errorCode: 'obligation.commodityLine.atLeastOne'
    }
  }

  it('emits one collection-scoped MIN_ENTRIES error when records.length is below the floor', () => {
    const st = state({
      obligations: impls([
        {
          obligation: commodityLineGroup,
          impl: { inScope: true, records: [] }
        }
      ])
    })
    expect(groupInvariantErrors(groupWithFloor, st)).toEqual([
      {
        code: 'MIN_ENTRIES',
        groupId: commodityLineGroup.id,
        groupName: 'commodityLine',
        errorCode: 'obligation.commodityLine.atLeastOne',
        minEntries: 1,
        actual: 0
      }
    ])
  })

  it('emits no floor error when records.length meets the floor', () => {
    const st = state({
      obligations: impls([
        {
          obligation: commodityLineGroup,
          impl: { inScope: true, records: [{ fulfilmentId: 'line1' }] }
        }
      ])
    })
    expect(groupInvariantErrors(groupWithFloor, st)).toEqual([])
  })

  it('emits no floor error when the group is out of scope', () => {
    // A group whose `applyTo` returns inScope:false is not applicable
    // at all, so the floor doesn't apply either. Symmetric with the
    // `anyOf` early-return.
    const st = state({
      obligations: impls([
        {
          obligation: commodityLineGroup,
          impl: { inScope: false }
        }
      ])
    })
    expect(groupInvariantErrors(groupWithFloor, st)).toEqual([])
  })

  it('composes with `requires.anyOf` — both a floor error and per-instance errors surface', () => {
    // A group carrying both a floor and an anyOf: with fewer records
    // than the floor AND unfilled leaves on each present record, the
    // two rules must co-emit. Here minEntries=2 but only 1 record
    // exists — expect one MIN_ENTRIES error plus one anyOf error on
    // the unfilled record.
    const leafObl = { id: 'leaf', name: 'leaf' }
    const composite = {
      ...commodityLineGroup,
      requires: {
        minEntries: 2,
        anyOfIds: [leafObl.id],
        errorCode: 'obligation.commodityLine.atLeastOne'
      }
    }
    const st = state({
      obligations: impls([
        {
          obligation: commodityLineGroup,
          impl: { inScope: true, records: [{ fulfilmentId: 'line1' }] }
        },
        {
          obligation: leafObl,
          impl: {
            inScope: true,
            records: [{ fulfilmentId: 'line1', status: 'optional' }]
          }
        }
      ])
    })
    const errors = groupInvariantErrors(composite, st)
    expect(errors).toHaveLength(2)
    expect(errors.some((e) => e.code === 'MIN_ENTRIES')).toBe(true)
    expect(errors.some((e) => e.instanceId === 'line1')).toBe(true)
  })
})

// Symmetric to `minEntries`. Wired into `accompanyingDocument`
// (maxEntries: 10) as the authoritative cap — the summary UI mirrors
// it but this invariant is the redeploy-safety net (state saved with
// 10 records survives; a redeploy lowering the cap to 9 fires the
// invariant on the 10th record until the user deletes one).
describe('groupInvariantErrors — `requires.maxEntries` collection cap', () => {
  const group = { id: 'g', name: 'accompanyingDocument' }
  const groupWithCap = {
    ...group,
    requires: {
      maxEntries: 10,
      maxEntriesErrorCode: 'obligation.accompanyingDocument.tooMany'
    }
  }
  const records = (n) =>
    Array.from({ length: n }, (_, i) => ({ fulfilmentId: `doc${i + 1}` }))

  it('emits no error when records.length is below the cap', () => {
    const st = state({
      obligations: impls([
        { obligation: group, impl: { inScope: true, records: records(3) } }
      ])
    })
    expect(groupInvariantErrors(groupWithCap, st)).toEqual([])
  })

  it('emits no error when records.length equals the cap', () => {
    const st = state({
      obligations: impls([
        { obligation: group, impl: { inScope: true, records: records(10) } }
      ])
    })
    expect(groupInvariantErrors(groupWithCap, st)).toEqual([])
  })

  it('emits one MAX_ENTRIES error when records.length exceeds the cap', () => {
    const st = state({
      obligations: impls([
        { obligation: group, impl: { inScope: true, records: records(11) } }
      ])
    })
    expect(groupInvariantErrors(groupWithCap, st)).toEqual([
      {
        code: 'MAX_ENTRIES',
        groupId: group.id,
        groupName: 'accompanyingDocument',
        errorCode: 'obligation.accompanyingDocument.tooMany',
        maxEntries: 10,
        actual: 11
      }
    ])
  })

  it('emits no error when the group is out of scope', () => {
    const st = state({
      obligations: impls([{ obligation: group, impl: { inScope: false } }])
    })
    expect(groupInvariantErrors(groupWithCap, st)).toEqual([])
  })

  it('composes with `requires.minEntries` — both a floor error and a cap error can coexist', () => {
    // Not realistic in practice (a cap below a floor is nonsense) but
    // proves the invariants compose without cross-talk.
    const composite = {
      ...group,
      requires: {
        minEntries: 5,
        maxEntries: 3,
        errorCode: 'floor-err',
        maxEntriesErrorCode: 'cap-err'
      }
    }
    const st = state({
      obligations: impls([
        { obligation: group, impl: { inScope: true, records: records(4) } }
      ])
    })
    const errors = groupInvariantErrors(composite, st)
    expect(errors.map((e) => e.code).sort()).toEqual([
      'MAX_ENTRIES',
      'MIN_ENTRIES'
    ])
  })

  it('falls back to `errorCode` when maxEntriesErrorCode is omitted', () => {
    const composite = {
      ...group,
      requires: { maxEntries: 2, errorCode: 'shared-err' }
    }
    const st = state({
      obligations: impls([
        { obligation: group, impl: { inScope: true, records: records(3) } }
      ])
    })
    const errors = groupInvariantErrors(composite, st)
    expect(errors).toHaveLength(1)
    expect(errors[0].errorCode).toBe('shared-err')
  })
})

// The V4 accompanying-document field block. Container obligation
// carries `requires.allOrNothingOfIds` naming its four scalar member
// obligations. Errors emerge from state.fulfilments directly (no
// records loop) so the primitive works for notification-level scalars
// without a records-shaped storage rewrite.
describe('groupInvariantErrors (V4 requires.allOrNothingOfIds)', () => {
  const container = {
    id: 'aon-container',
    name: 'accompanyingDocument'
  }
  const member = (n) => ({ id: `member-${n}`, name: `member${n}` })
  const [a, b, c, d] = [1, 2, 3, 4].map(member)
  const containerWithRule = {
    ...container,
    requires: {
      allOrNothingOfIds: [a.id, b.id, c.id, d.id],
      errorCode: 'obligation.accompanyingDocument.allOrNothing'
    }
  }

  const inScopeContainer = state({
    obligations: impls([{ obligation: container, impl: { inScope: true } }])
  })
  const withFulfilments = (fulfilments) => ({
    ...inScopeContainer,
    fulfilments
  })

  it('empty list when all four members are blank (block inactive)', () => {
    expect(groupInvariantErrors(containerWithRule, inScopeContainer)).toEqual(
      []
    )
  })

  it('empty list when all four members are filled (block complete)', () => {
    const st = withFulfilments({
      [a.id]: 'type-x',
      [b.id]: 'pdf',
      [c.id]: 'REF-1',
      [d.id]: '2026-01-01'
    })
    expect(groupInvariantErrors(containerWithRule, st)).toEqual([])
  })

  it.each([
    ['single field filled', { [a.id]: 'type-x' }, [b.id, c.id, d.id]],
    ['two fields filled', { [a.id]: 'type-x', [c.id]: 'REF-1' }, [b.id, d.id]],
    [
      'three fields filled',
      { [a.id]: 'type-x', [b.id]: 'pdf', [c.id]: 'REF-1' },
      [d.id]
    ]
  ])('emits ONE error when partial: %s', (_label, fulfilments, missingIds) => {
    const errors = groupInvariantErrors(
      containerWithRule,
      withFulfilments(fulfilments)
    )
    expect(errors).toHaveLength(1)
    expect(errors[0]).toEqual({
      code: 'obligation.accompanyingDocument.allOrNothing',
      groupId: container.id,
      groupName: 'accompanyingDocument',
      missingIds
    })
  })

  it.each([
    ['empty string', ''],
    ['null', null],
    ['undefined', undefined],
    ['empty array', []]
  ])('treats %s as blank (matches isBlankValue)', (_label, blank) => {
    // A single "blank" value on Type + real values on the other three
    // is partial from the invariant's perspective.
    const st = withFulfilments({
      [a.id]: blank,
      [b.id]: 'pdf',
      [c.id]: 'REF-1',
      [d.id]: '2026-01-01'
    })
    const errors = groupInvariantErrors(containerWithRule, st)
    expect(errors).toHaveLength(1)
    expect(errors[0].missingIds).toEqual([a.id])
  })

  it('empty list when the container is out of scope', () => {
    const st = {
      ...withFulfilments({ [a.id]: 'type-x' }),
      obligations: impls([{ obligation: container, impl: { inScope: false } }])
    }
    expect(groupInvariantErrors(containerWithRule, st)).toEqual([])
  })
})

// The V4 "unit records ARE animals" invariant. On unitRecord the
// rule reads: for each parent commodityLine instance lineX, the count
// of unitRecord records with fulfilmentId prefixed `lineX/` equals the
// scalar `numberOfAnimals[lineX]`. Skips when the scalar is blank
// (mandatoryToProceed on the number-of-animals page handles that
// separately).
describe('groupInvariantErrors (V4 requires.recordCountEquals)', () => {
  const parentGroup = { id: 'parent-group', name: 'commodityLine' }
  const childGroup = {
    id: 'child-group',
    name: 'unitRecord',
    within: parentGroup
  }
  const countField = { id: 'count-field', name: 'numberOfAnimals' }
  const childWithRule = {
    ...childGroup,
    requires: {
      recordCountEquals: {
        fieldId: countField.id,
        errorCode: 'obligation.unitRecord.countMustMatchNumberOfAnimals'
      }
    }
  }

  const stateWith = ({ parentIds = [], childIds = [], counts = {} } = {}) => ({
    fulfilments: {
      [countField.id]: counts
    },
    obligations: impls([
      {
        obligation: parentGroup,
        impl: {
          inScope: true,
          records: parentIds.map((id) => ({ fulfilmentId: id }))
        }
      },
      {
        obligation: childWithRule,
        impl: {
          inScope: true,
          records: childIds.map((id) => ({ fulfilmentId: id }))
        }
      }
    ])
  })

  it('empty list when the field is blank for every parent (skip case)', () => {
    // numberOfAnimals not yet filled — the mandatoryToProceed rule on
    // the number-of-animals page handles the "you forgot to answer"
    // case; the count invariant only fires once you have a value.
    const st = stateWith({
      parentIds: ['lineA'],
      childIds: ['lineA/unit1', 'lineA/unit2'],
      counts: {}
    })
    expect(groupInvariantErrors(childWithRule, st)).toEqual([])
  })

  it('empty list when the group is out of scope', () => {
    const st = {
      fulfilments: { [countField.id]: { lineA: 3 } },
      obligations: impls([
        { obligation: parentGroup, impl: { inScope: true, records: [] } },
        { obligation: childWithRule, impl: { inScope: false } }
      ])
    }
    expect(groupInvariantErrors(childWithRule, st)).toEqual([])
  })

  it('zero errors when actual === expected', () => {
    const st = stateWith({
      parentIds: ['lineA'],
      childIds: ['lineA/unit1', 'lineA/unit2'],
      counts: { lineA: 2 }
    })
    expect(groupInvariantErrors(childWithRule, st)).toEqual([])
  })

  it('one error when actual < expected (too few units for the declared count)', () => {
    const st = stateWith({
      parentIds: ['lineA'],
      childIds: ['lineA/unit1'],
      counts: { lineA: 3 }
    })
    expect(groupInvariantErrors(childWithRule, st)).toEqual([
      {
        code: 'obligation.unitRecord.countMustMatchNumberOfAnimals',
        groupId: childGroup.id,
        groupName: 'unitRecord',
        instanceId: 'lineA',
        expected: 3,
        actual: 1
      }
    ])
  })

  it('one error when actual > expected (user reduced numberOfAnimals below current unit count)', () => {
    const st = stateWith({
      parentIds: ['lineA'],
      childIds: ['lineA/unit1', 'lineA/unit2', 'lineA/unit3'],
      counts: { lineA: 1 }
    })
    const errors = groupInvariantErrors(childWithRule, st)
    expect(errors).toEqual([
      {
        code: 'obligation.unitRecord.countMustMatchNumberOfAnimals',
        groupId: childGroup.id,
        groupName: 'unitRecord',
        instanceId: 'lineA',
        expected: 1,
        actual: 3
      }
    ])
  })

  it('emits one error per violating parent instance, silent on matching ones', () => {
    const st = stateWith({
      parentIds: ['lineA', 'lineB', 'lineC'],
      childIds: [
        // lineA: 2 expected, 2 actual → OK
        'lineA/unit1',
        'lineA/unit2',
        // lineB: 3 expected, 1 actual → error
        'lineB/unit1',
        // lineC: 1 expected, 2 actual → error
        'lineC/unit1',
        'lineC/unit2'
      ],
      counts: { lineA: 2, lineB: 3, lineC: 1 }
    })
    const errors = groupInvariantErrors(childWithRule, st)
    expect(errors).toHaveLength(2)
    expect(errors.map((e) => e.instanceId).sort()).toEqual(['lineB', 'lineC'])
  })

  it('skips a parent instance whose scalar is blank while checking others', () => {
    const st = stateWith({
      parentIds: ['lineA', 'lineB'],
      childIds: ['lineA/unit1', 'lineB/unit1', 'lineB/unit2'],
      counts: { lineB: 1 } // lineA blank → skip; lineB mismatched → error
    })
    const errors = groupInvariantErrors(childWithRule, st)
    expect(errors).toHaveLength(1)
    expect(errors[0].instanceId).toBe('lineB')
  })

  it('composes with anyOfIds — a single group can emit both kinds', () => {
    const identifier = { id: 'identifier-leaf' }
    const composite = {
      ...childGroup,
      requires: {
        anyOfIds: [identifier.id],
        errorCode: 'obligation.unitRecord.identifiersRequired',
        recordCountEquals: {
          fieldId: countField.id,
          errorCode: 'obligation.unitRecord.countMustMatchNumberOfAnimals'
        }
      }
    }
    // lineA has 1 unit-record with no identifier filled (anyOfIds
    // fires) and expected count is 2 (recordCountEquals fires).
    const st = {
      fulfilments: {
        [countField.id]: { lineA: 2 }
      },
      obligations: impls([
        {
          obligation: parentGroup,
          impl: { inScope: true, records: [{ fulfilmentId: 'lineA' }] }
        },
        {
          obligation: composite,
          impl: {
            inScope: true,
            records: [{ fulfilmentId: 'lineA/unit1' }]
          }
        },
        {
          obligation: identifier,
          impl: {
            inScope: true,
            records: [{ fulfilmentId: 'lineA/unit1', status: 'optional' }]
          }
        }
      ])
    }
    const errors = groupInvariantErrors(composite, st)
    expect(errors).toHaveLength(2)
    expect(errors.map((e) => e.code).sort()).toEqual([
      'obligation.unitRecord.countMustMatchNumberOfAnimals',
      'obligation.unitRecord.identifiersRequired'
    ])
  })
})

describe('containerStatus + journeyState with `requires.minEntries`', () => {
  // Integration: a container that presentsForEach off a floored group
  // must roll up to NS when zero records exist — today (pre-floor) it
  // collapses to NA (0 in-scope entries + 0 group errors), and
  // `journeyState` therefore returns fulfilled for a session with no
  // commodity lines at all. That's the REPORT §7 live defect.
  const commodityLineGroup = { id: 'commodity-line', name: 'commodityLine' }
  const codeLeaf = {
    id: 'commodity-code',
    name: 'commodityCode',
    within: commodityLineGroup
  }

  const flooredGroup = {
    ...commodityLineGroup,
    requires: {
      minEntries: 1,
      errorCode: 'obligation.commodityLine.atLeastOne'
    }
  }

  const container = {
    children: [
      {
        page: 'commodity-code',
        presentsForEach: { obligation: codeLeaf, forEachOf: flooredGroup }
      }
    ]
  }

  it('containerStatus is NOT_STARTED (not NOT_APPLICABLE) when records=0 and floor unmet', () => {
    const st = state({
      obligations: impls([
        {
          obligation: flooredGroup,
          impl: { inScope: true, records: [] }
        },
        { obligation: codeLeaf, impl: { inScope: true, records: [] } }
      ])
    })
    // Pre-floor: NA (0 entries, 0 group errors, classifyEntries collapses).
    // Post-floor: 1 group error → mandatory concern unfulfilled →
    // touched=0 → NS. This is the shape REPORT §7 flagged.
    expect(containerStatus(container, st)).toBe(STATUSES.NOT_STARTED)
  })

  it('journeyState is NOT `fulfilled` for a session with zero records under a floored group', () => {
    // Prior to the floor, `journeyState` would return FULFILLED here
    // because `expandPresents` yields 0 entries for 0 records and
    // `groupInvariantErrors` returned [] (nothing to iterate). CYA
    // then printed "ready to submit" for an empty consignment.
    const flow = { sections: [container] }
    const st = state({
      obligations: impls([
        {
          obligation: flooredGroup,
          impl: { inScope: true, records: [] }
        },
        { obligation: codeLeaf, impl: { inScope: true, records: [] } }
      ])
    })
    expect(journeyState(flow, st)).not.toBe(STATUSES.FULFILLED)
  })
})

describe('containerStatus with group invariants', () => {
  // Same synthetic setup as groupInvariantErrors — a container whose
  // pages present unitRecord-scoped obligations should stay IP when
  // any unit violates its `requires` invariant, even when every page
  // is individually F (all leaves optional).
  const unitRecord = { id: 'unit-group', name: 'unitRecord' }
  const passport = { id: 'passport', name: 'passport' }

  const groupWithRequires = {
    ...unitRecord,
    requires: {
      anyOfIds: [passport.id],
      errorCode: 'obligation.unitRecord.identifiersRequired'
    }
  }

  const container = {
    children: [
      {
        page: 'passport',
        presentsForEach: { obligation: passport, forEachOf: groupWithRequires }
      }
    ]
  }

  it('subsection with unfilled required-any-of stays IN_PROGRESS (blocks F)', () => {
    const st = state({
      obligations: impls([
        {
          obligation: groupWithRequires,
          impl: { inScope: true, records: [{ fulfilmentId: 'line1/unit1' }] }
        },
        {
          obligation: passport,
          impl: {
            inScope: true,
            records: [{ fulfilmentId: 'line1/unit1', status: 'optional' }]
          }
        }
      ])
    })
    // Without the invariant check, the page (optional-only) would roll
    // up to F. The invariant blocks it — but note the "empty session"
    // NS guard: since nothing under the container has any fulfilment,
    // status is NS not IP.
    expect(containerStatus(container, st)).toBe(STATUSES.NOT_STARTED)
  })

  it('subsection with any leaf filled satisfies the invariant → F', () => {
    const st = state({
      fulfilments: { [passport.id]: { 'line1/unit1': 'PP-001' } },
      obligations: impls([
        {
          obligation: groupWithRequires,
          impl: { inScope: true, records: [{ fulfilmentId: 'line1/unit1' }] }
        },
        {
          obligation: passport,
          impl: {
            inScope: true,
            records: [{ fulfilmentId: 'line1/unit1', status: 'optional' }]
          }
        }
      ])
    })
    expect(containerStatus(container, st)).toBe(STATUSES.FULFILLED)
  })
})

describe('groupInvariantErrorsForContainer scoping', () => {
  const unitRecord = { id: 'unit-group', name: 'unitRecord' }
  const passport = { id: 'passport', name: 'passport' }
  const groupWithRequires = {
    ...unitRecord,
    requires: {
      anyOfIds: [passport.id],
      errorCode: 'obligation.unitRecord.identifiersRequired'
    }
  }

  it('only walks groups referenced by a presentsForEach.forEachOf under this container', () => {
    // A container that DOESN'T present anything for the group returns
    // empty even if the group is globally violating.
    const st = state({
      obligations: impls([
        {
          obligation: groupWithRequires,
          impl: { inScope: true, records: [{ fulfilmentId: 'line1/unit1' }] }
        },
        {
          obligation: passport,
          impl: {
            inScope: true,
            records: [{ fulfilmentId: 'line1/unit1', status: 'optional' }]
          }
        }
      ])
    })
    const containerElsewhere = {
      children: [{ page: 'x', presents: [{ obligation: passport }] }]
    }
    expect(groupInvariantErrorsForContainer(containerElsewhere, st)).toEqual([])
  })
})
