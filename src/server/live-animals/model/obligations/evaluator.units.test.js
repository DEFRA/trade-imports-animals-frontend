import { describe, it, expect } from 'vitest'
import {
  buildObligationsById,
  buildObligationChildren,
  classifyObligations,
  buildAncestorGroups,
  buildDescendants,
  dropUnknownFulfilments,
  runApplicabilityDecisions,
  makeInScopeCheck,
  purgeStorage,
  enumerateGroupFulfilmentIds,
  buildImplications,
  buildImplication
} from './evaluator.js'

// Synthetic fixtures — small hand-crafted obligation manifests that let each
// extracted function be exercised without the full obligations model.
//
// Naming convention: two-letter ids for readability at assertion sites
// ('g1' = group 1, 'f1' = field 1, etc.). Real obligations use UUIDs.

// ---------------------------------------------------------------------------
// Construction-phase builders
// ---------------------------------------------------------------------------

describe('buildObligationsById', () => {
  it('empty manifest → empty Map', () => {
    const result = buildObligationsById([])
    expect(result.size).toBe(0)
  })

  it('single obligation → one entry keyed by id', () => {
    const obligation = { id: 'o1', name: 'one' }
    const result = buildObligationsById([obligation])
    expect(result.size).toBe(1)
    expect(result.get('o1')).toBe(obligation)
  })

  it('multiple obligations → each id maps to its own record', () => {
    const first = { id: 'a', name: 'a' }
    const second = { id: 'b', name: 'b' }
    const result = buildObligationsById([first, second])
    expect(result.get('a')).toBe(first)
    expect(result.get('b')).toBe(second)
  })
})

describe('buildObligationChildren', () => {
  it('empty manifest → empty Map', () => {
    expect(buildObligationChildren([]).size).toBe(0)
  })

  it('no `within` refs → empty Map', () => {
    const obligations = [{ id: 'a' }, { id: 'b' }]
    expect(buildObligationChildren(obligations).size).toBe(0)
  })

  it('one parent + two children → parent id maps to both children', () => {
    const parent = { id: 'p' }
    const c1 = { id: 'c1', within: parent }
    const c2 = { id: 'c2', within: parent }
    const result = buildObligationChildren([parent, c1, c2])
    expect(result.get('p')).toEqual([c1, c2])
  })

  it('multiple parents, each with own children', () => {
    const p1 = { id: 'p1' }
    const p2 = { id: 'p2' }
    const c1 = { id: 'c1', within: p1 }
    const c2 = { id: 'c2', within: p2 }
    const result = buildObligationChildren([p1, p2, c1, c2])
    expect(result.get('p1')).toEqual([c1])
    expect(result.get('p2')).toEqual([c2])
  })
})

describe('classifyObligations', () => {
  const noChildren = new Map()

  it('single-cardinality (no indexedBy / status / children) → "single"', () => {
    const obligation = { id: 'o', applyTo: () => ({}) }
    const result = classifyObligations([obligation], noChildren)
    expect(result.get('o')).toBe('single')
  })

  it('field record (status, no applyTo, no indexedBy) → "field"', () => {
    const obligation = { id: 'o', status: 'mandatory', within: { id: 'g' } }
    const result = classifyObligations([obligation], noChildren)
    expect(result.get('o')).toBe('field')
  })

  it('group (has children, no status/indexedBy) → "group"', () => {
    const group = { id: 'g' }
    const child = { id: 'c', within: group }
    const children = buildObligationChildren([group, child])
    const result = classifyObligations([group, child], children)
    expect(result.get('g')).toBe('group')
  })

  it('derived indexed leaf → "derived-leaf"', () => {
    const obligation = {
      id: 'o',
      indexedBy: { source: 'derived', controllingObligation: {} },
      applyTo: () => ({})
    }
    const result = classifyObligations([obligation], noChildren)
    expect(result.get('o')).toBe('derived-leaf')
  })

  it('user indexed leaf → "user-leaf"', () => {
    const obligation = { id: 'o', indexedBy: { source: 'user' } }
    const result = classifyObligations([obligation], noChildren)
    expect(result.get('o')).toBe('user-leaf')
  })

  it('non-derived indexedBy source falls through to "user-leaf" (seeded case)', () => {
    const obligation = { id: 'o', indexedBy: { source: 'seeded' } }
    const result = classifyObligations([obligation], noChildren)
    expect(result.get('o')).toBe('user-leaf')
  })

  it('single-cardinality with applyTo is preferred over field even if status present', () => {
    // Any obligation with applyTo bypasses the "field" branch.
    const obligation = { id: 'o', status: 'mandatory', applyTo: () => ({}) }
    const result = classifyObligations([obligation], noChildren)
    expect(result.get('o')).not.toBe('field')
  })
})

describe('buildAncestorGroups', () => {
  it('empty manifest → empty Map', () => {
    expect(buildAncestorGroups([]).size).toBe(0)
  })

  it('obligation with no `within` → empty chain', () => {
    const obligation = { id: 'o' }
    const result = buildAncestorGroups([obligation])
    expect(result.get('o')).toEqual([])
  })

  it('depth-1 → single-element chain', () => {
    const group = { id: 'g' }
    const child = { id: 'c', within: group }
    const result = buildAncestorGroups([group, child])
    expect(result.get('c')).toEqual([group])
  })

  it('depth-3 → chain in root-to-leaf order', () => {
    const root = { id: 'root' }
    const mid = { id: 'mid', within: root }
    const leaf = { id: 'leaf', within: mid }
    const result = buildAncestorGroups([root, mid, leaf])
    expect(result.get('leaf')).toEqual([root, mid])
  })
})

describe('buildDescendants', () => {
  it('empty manifest → empty Map', () => {
    expect(buildDescendants([], new Map()).size).toBe(0)
  })

  it('leaf → empty descendants array', () => {
    const obligation = { id: 'o' }
    const children = buildObligationChildren([obligation])
    const result = buildDescendants([obligation], children)
    expect(result.get('o')).toEqual([])
  })

  it('group with two children → both children are descendants', () => {
    const group = { id: 'g' }
    const c1 = { id: 'c1', within: group }
    const c2 = { id: 'c2', within: group }
    const children = buildObligationChildren([group, c1, c2])
    const descendants = buildDescendants([group, c1, c2], children).get('g')
    expect(descendants).toHaveLength(2)
    expect(descendants).toContain(c1)
    expect(descendants).toContain(c2)
  })

  it('depth-3 chain → all levels included', () => {
    const root = { id: 'root' }
    const mid = { id: 'mid', within: root }
    const leaf = { id: 'leaf', within: mid }
    const children = buildObligationChildren([root, mid, leaf])
    const descendants = buildDescendants([root, mid, leaf], children).get(
      'root'
    )
    expect(descendants).toHaveLength(2)
    expect(descendants).toContain(mid)
    expect(descendants).toContain(leaf)
  })
})

// ---------------------------------------------------------------------------
// Evaluate-phase helpers
// ---------------------------------------------------------------------------

describe('dropUnknownFulfilments', () => {
  const obligationsById = new Map([
    ['a', {}],
    ['b', {}]
  ])

  it('empty input → empty output', () => {
    expect(dropUnknownFulfilments({}, obligationsById)).toEqual({})
  })

  it('keeps known ids', () => {
    const result = dropUnknownFulfilments({ a: 1, b: 2 }, obligationsById)
    expect(result).toEqual({ a: 1, b: 2 })
  })

  it('drops unknown ids', () => {
    const result = dropUnknownFulfilments(
      { a: 1, unknown: 99 },
      obligationsById
    )
    expect(result).toEqual({ a: 1 })
  })

  it('preserves values verbatim (including objects and arrays)', () => {
    const obj = { nested: 'value' }
    const arr = [1, 2, 3]
    const result = dropUnknownFulfilments({ a: obj, b: arr }, obligationsById)
    expect(result.a).toBe(obj)
    expect(result.b).toBe(arr)
  })
})

describe('runApplicabilityDecisions', () => {
  it('obligation without applyTo → no entry in result', () => {
    const obligation = { id: 'o' }
    const result = runApplicabilityDecisions([obligation], {})
    expect(result.has('o')).toBe(false)
  })

  it('obligation with applyTo → applyTo return in result', () => {
    const obligation = {
      id: 'o',
      applyTo: () => ({ inScope: true, status: 'mandatory' })
    }
    const result = runApplicabilityDecisions([obligation], {})
    expect(result.get('o')).toEqual({ inScope: true, status: 'mandatory' })
  })

  it('applyTo receives the recognised fulfilments', () => {
    let received
    const obligation = {
      id: 'o',
      applyTo: (fulfilments) => {
        received = fulfilments
        return { inScope: true }
      }
    }
    runApplicabilityDecisions([obligation], { some: 'input' })
    expect(received).toEqual({ some: 'input' })
  })

  it('multiple obligations → each with its own entry', () => {
    const first = { id: 'a', applyTo: () => ({ inScope: true }) }
    const second = { id: 'b', applyTo: () => ({ inScope: false }) }
    const result = runApplicabilityDecisions([first, second], {})
    expect(result.get('a')).toEqual({ inScope: true })
    expect(result.get('b')).toEqual({ inScope: false })
  })
})

describe('makeInScopeCheck', () => {
  it('no applyTo entry → in scope (default true)', () => {
    const isInScope = makeInScopeCheck(new Map(), new Map([['o', []]]))
    expect(isInScope({ id: 'o' })).toBe(true)
  })

  it('own applyTo inScope=true → in scope', () => {
    const decisions = new Map([['o', { inScope: true }]])
    const isInScope = makeInScopeCheck(decisions, new Map([['o', []]]))
    expect(isInScope({ id: 'o' })).toBe(true)
  })

  it('own applyTo inScope=false → out of scope', () => {
    const decisions = new Map([['o', { inScope: false }]])
    const isInScope = makeInScopeCheck(decisions, new Map([['o', []]]))
    expect(isInScope({ id: 'o' })).toBe(false)
  })

  it('ancestor out of scope → self out of scope', () => {
    const parent = { id: 'p' }
    const child = { id: 'c' }
    const decisions = new Map([['p', { inScope: false }]])
    const ancestorGroups = new Map([
      ['p', []],
      ['c', [parent]]
    ])
    const isInScope = makeInScopeCheck(decisions, ancestorGroups)
    expect(isInScope(child)).toBe(false)
  })

  it('multi-hop ancestor out of scope → self out of scope', () => {
    const root = { id: 'root' }
    const mid = { id: 'mid' }
    const leaf = { id: 'leaf' }
    const decisions = new Map([['root', { inScope: false }]])
    const ancestorGroups = new Map([
      ['root', []],
      ['mid', [root]],
      ['leaf', [root, mid]]
    ])
    const isInScope = makeInScopeCheck(decisions, ancestorGroups)
    expect(isInScope(leaf)).toBe(false)
  })

  it('memoises — repeated calls return the same cached result', () => {
    let calls = 0
    const decisions = new Map([
      [
        'o',
        {
          get inScope() {
            calls++
            return true
          }
        }
      ]
    ])
    const isInScope = makeInScopeCheck(decisions, new Map([['o', []]]))
    isInScope({ id: 'o' })
    isInScope({ id: 'o' })
    isInScope({ id: 'o' })
    // First call reads .inScope twice (once for the false-guard, once for
    // the cache-set decision path); repeated calls hit the cache and
    // don't re-read at all.
    expect(calls).toBeLessThanOrEqual(2)
  })
})

describe('purgeStorage', () => {
  const alwaysInScope = () => true
  const alwaysOutOfScope = () => false

  it('empty input → empty output', () => {
    const result = purgeStorage(
      {},
      {
        obligationsById: new Map(),
        obligationsByCategory: new Map(),
        obligationApplicabilityDecisions: new Map(),
        isInScope: alwaysInScope
      }
    )
    expect(result).toEqual({})
  })

  it('out-of-scope obligation → its entry dropped', () => {
    const obligation = { id: 'o' }
    const result = purgeStorage(
      { o: 'value' },
      {
        obligationsById: new Map([['o', obligation]]),
        obligationsByCategory: new Map([['o', 'single']]),
        obligationApplicabilityDecisions: new Map(),
        isInScope: alwaysOutOfScope
      }
    )
    expect(result).toEqual({})
  })

  it('single-cardinality in scope → value kept verbatim', () => {
    const obligation = { id: 'o' }
    const result = purgeStorage(
      { o: 'Alex' },
      {
        obligationsById: new Map([['o', obligation]]),
        obligationsByCategory: new Map([['o', 'single']]),
        obligationApplicabilityDecisions: new Map(),
        isInScope: alwaysInScope
      }
    )
    expect(result).toEqual({ o: 'Alex' })
  })

  it('derived leaf → keys in applyTo set kept, others dropped', () => {
    const obligation = { id: 'o', indexedBy: { source: 'derived' } }
    const result = purgeStorage(
      { o: { turbo: '800', alloys: '200', stale: '999' } },
      {
        obligationsById: new Map([['o', obligation]]),
        obligationsByCategory: new Map([['o', 'derived-leaf']]),
        obligationApplicabilityDecisions: new Map([
          ['o', { records: ['turbo', 'alloys'] }]
        ]),
        isInScope: alwaysInScope
      }
    )
    expect(result).toEqual({ o: { turbo: '800', alloys: '200' } })
  })

  it('derived leaf with empty applyTo set → entry omitted entirely', () => {
    const obligation = { id: 'o', indexedBy: { source: 'derived' } }
    const result = purgeStorage(
      { o: { turbo: '800' } },
      {
        obligationsById: new Map([['o', obligation]]),
        obligationsByCategory: new Map([['o', 'derived-leaf']]),
        obligationApplicabilityDecisions: new Map([['o', { records: [] }]]),
        isInScope: alwaysInScope
      }
    )
    expect(result.o).toBeUndefined()
  })

  it('field record → map kept as-is', () => {
    const obligation = { id: 'o', within: { id: 'g' }, status: 'mandatory' }
    const stored = { c1: 'accident', c2: 'theft' }
    const result = purgeStorage(
      { o: stored },
      {
        obligationsById: new Map([['o', obligation]]),
        obligationsByCategory: new Map([['o', 'field']]),
        obligationApplicabilityDecisions: new Map(),
        isInScope: alwaysInScope
      }
    )
    expect(result.o).toEqual(stored)
  })

  it('user leaf → map kept as-is', () => {
    const obligation = { id: 'o', indexedBy: { source: 'user' } }
    const stored = { 'd1/a1': { line1: '10 High St' } }
    const result = purgeStorage(
      { o: stored },
      {
        obligationsById: new Map([['o', obligation]]),
        obligationsByCategory: new Map([['o', 'user-leaf']]),
        obligationApplicabilityDecisions: new Map(),
        isInScope: alwaysInScope
      }
    )
    expect(result.o).toEqual(stored)
  })

  it('empty object storage → entry omitted entirely', () => {
    const obligation = { id: 'o', indexedBy: { source: 'user' } }
    const result = purgeStorage(
      { o: {} },
      {
        obligationsById: new Map([['o', obligation]]),
        obligationsByCategory: new Map([['o', 'user-leaf']]),
        obligationApplicabilityDecisions: new Map(),
        isInScope: alwaysInScope
      }
    )
    expect(result.o).toBeUndefined()
  })
})

describe('enumerateGroupFulfilmentIds', () => {
  const alwaysInScope = () => true

  it('empty manifest → empty Map', () => {
    const result = enumerateGroupFulfilmentIds([], {
      obligationsByCategory: new Map(),
      obligationAncestorGroups: new Map(),
      obligationDescendants: new Map(),
      isInScope: alwaysInScope,
      amendedFulfilments: {}
    })
    expect(result.size).toBe(0)
  })

  it('skips non-group obligations', () => {
    const obligation = { id: 'o' }
    const result = enumerateGroupFulfilmentIds([obligation], {
      obligationsByCategory: new Map([['o', 'single']]),
      obligationAncestorGroups: new Map([['o', []]]),
      obligationDescendants: new Map([['o', []]]),
      isInScope: alwaysInScope,
      amendedFulfilments: {}
    })
    expect(result.has('o')).toBe(false)
  })

  it('out-of-scope group → empty Set', () => {
    const group = { id: 'g' }
    const result = enumerateGroupFulfilmentIds([group], {
      obligationsByCategory: new Map([['g', 'group']]),
      obligationAncestorGroups: new Map([['g', []]]),
      obligationDescendants: new Map([['g', []]]),
      isInScope: () => false,
      amendedFulfilments: {}
    })
    expect(result.get('g')).toEqual(new Set())
  })

  it('top-level group (prefixLen=1) with one descendant field → single instance id', () => {
    const group = { id: 'g' }
    const field = { id: 'f', within: group }
    const result = enumerateGroupFulfilmentIds([group, field], {
      obligationsByCategory: new Map([
        ['g', 'group'],
        ['f', 'field']
      ]),
      obligationAncestorGroups: new Map([
        ['g', []],
        ['f', [group]]
      ]),
      obligationDescendants: new Map([
        ['g', [field]],
        ['f', []]
      ]),
      isInScope: alwaysInScope,
      amendedFulfilments: { f: { c1: 'accident' } }
    })
    expect(result.get('g')).toEqual(new Set(['c1']))
  })

  it('nested group (prefixLen=2) infers composite-path instance ids', () => {
    // driver → driverClaim → other-party leaf
    const driver = { id: 'driver' }
    const claim = { id: 'claim', within: driver }
    const leaf = {
      id: 'leaf',
      within: claim,
      indexedBy: { source: 'user' }
    }
    const result = enumerateGroupFulfilmentIds([driver, claim, leaf], {
      obligationsByCategory: new Map([
        ['driver', 'group'],
        ['claim', 'group'],
        ['leaf', 'user-leaf']
      ]),
      obligationAncestorGroups: new Map([
        ['driver', []],
        ['claim', [driver]],
        ['leaf', [driver, claim]]
      ]),
      obligationDescendants: new Map([
        ['driver', [claim, leaf]],
        ['claim', [leaf]],
        ['leaf', []]
      ]),
      isInScope: alwaysInScope,
      amendedFulfilments: {
        leaf: {
          'd1/c1/p1': {},
          'd1/c1/p2': {},
          'd1/c2/p3': {}
        }
      }
    })
    // driver at depth 1 → {d1}
    expect(result.get('driver')).toEqual(new Set(['d1']))
    // driverClaim at depth 2 → {d1/c1, d1/c2}
    expect(result.get('claim')).toEqual(new Set(['d1/c1', 'd1/c2']))
  })

  it('descendant with non-object storage → skipped', () => {
    const group = { id: 'g' }
    const field = { id: 'f', within: group }
    const result = enumerateGroupFulfilmentIds([group, field], {
      obligationsByCategory: new Map([
        ['g', 'group'],
        ['f', 'field']
      ]),
      obligationAncestorGroups: new Map([
        ['g', []],
        ['f', [group]]
      ]),
      obligationDescendants: new Map([
        ['g', [field]],
        ['f', []]
      ]),
      isInScope: alwaysInScope,
      amendedFulfilments: { f: 'string-value-not-a-map' }
    })
    expect(result.get('g')).toEqual(new Set())
  })
})

describe('buildImplications', () => {
  it('empty manifest → empty object', () => {
    const result = buildImplications([], {
      isInScope: () => true,
      obligationsByCategory: new Map(),
      obligationApplicabilityDecisions: new Map(),
      fulfilmentIdsByObligationId: new Map(),
      amendedFulfilments: {}
    })
    expect(result).toEqual({})
  })

  it('one entry per obligation, indexed by obligation id', () => {
    const first = {
      id: 'a',
      applyTo: () => ({ inScope: true, status: 'mandatory' })
    }
    const second = { id: 'b', applyTo: () => ({ inScope: false }) }
    const result = buildImplications([first, second], {
      isInScope: (obligation) => obligation.id === 'a',
      obligationsByCategory: new Map([
        ['a', 'single'],
        ['b', 'single']
      ]),
      obligationApplicabilityDecisions: new Map([
        ['a', { inScope: true, status: 'mandatory' }],
        ['b', { inScope: false }]
      ]),
      fulfilmentIdsByObligationId: new Map(),
      amendedFulfilments: {}
    })
    expect(result.a).toEqual({ inScope: true, status: 'mandatory' })
    expect(result.b).toEqual({ inScope: false })
  })
})

describe('buildImplication', () => {
  const inScopeAlways = () => true

  it('out of scope → { inScope: false } regardless of category', () => {
    const obligation = { id: 'o' }
    const result = buildImplication(obligation, {
      isInScope: () => false,
      obligationsByCategory: new Map([['o', 'single']]),
      obligationApplicabilityDecisions: new Map(),
      fulfilmentIdsByObligationId: new Map(),
      amendedFulfilments: {}
    })
    expect(result).toEqual({ inScope: false })
  })

  it('single-cardinality → returns applyTo output verbatim', () => {
    const obligation = { id: 'o' }
    const own = { inScope: true, status: 'optional', reasons: [{ code: 'x' }] }
    const result = buildImplication(obligation, {
      isInScope: inScopeAlways,
      obligationsByCategory: new Map([['o', 'single']]),
      obligationApplicabilityDecisions: new Map([['o', own]]),
      fulfilmentIdsByObligationId: new Map(),
      amendedFulfilments: {}
    })
    expect(result).toBe(own)
  })

  it('single-cardinality with no applyTo entry → { inScope: true }', () => {
    const obligation = { id: 'o' }
    const result = buildImplication(obligation, {
      isInScope: inScopeAlways,
      obligationsByCategory: new Map([['o', 'single']]),
      obligationApplicabilityDecisions: new Map(),
      fulfilmentIdsByObligationId: new Map(),
      amendedFulfilments: {}
    })
    expect(result).toEqual({ inScope: true })
  })

  it('group with reasons and instance ids → reasons + records list', () => {
    const group = { id: 'g' }
    const result = buildImplication(group, {
      isInScope: inScopeAlways,
      obligationsByCategory: new Map([['g', 'group']]),
      obligationApplicabilityDecisions: new Map([
        ['g', { inScope: true, reasons: [{ code: 'r' }] }]
      ]),
      fulfilmentIdsByObligationId: new Map([['g', new Set(['c1', 'c2'])]]),
      amendedFulfilments: {}
    })
    expect(result).toEqual({
      inScope: true,
      reasons: [{ code: 'r' }],
      records: [{ fulfilmentId: 'c1' }, { fulfilmentId: 'c2' }]
    })
  })

  it('group without reasons → reasons field omitted', () => {
    const group = { id: 'g' }
    const result = buildImplication(group, {
      isInScope: inScopeAlways,
      obligationsByCategory: new Map([['g', 'group']]),
      obligationApplicabilityDecisions: new Map(),
      fulfilmentIdsByObligationId: new Map([['g', new Set(['c1'])]]),
      amendedFulfilments: {}
    })
    expect(result.reasons).toBeUndefined()
  })

  it('field record → parent group instances with own status; no reasons', () => {
    const parent = { id: 'g' }
    const field = { id: 'f', within: parent, status: 'mandatory' }
    const result = buildImplication(field, {
      isInScope: inScopeAlways,
      obligationsByCategory: new Map([['f', 'field']]),
      obligationApplicabilityDecisions: new Map(),
      fulfilmentIdsByObligationId: new Map([['g', new Set(['c1', 'c2'])]]),
      amendedFulfilments: {}
    })
    expect(result).toEqual({
      inScope: true,
      records: [
        { fulfilmentId: 'c1', status: 'mandatory' },
        { fulfilmentId: 'c2', status: 'mandatory' }
      ]
    })
    expect(result.reasons).toBeUndefined()
  })

  // A top-level field-category obligation (no `within`) is a scalar
  // with an intrinsic status — e.g. `{ id, name, status: 'optional' }`.
  // The field branch must guard the `obligation.within.id` deref, since
  // an unconditional deref throws TypeError on this data-only shape.
  it('field record with no `within` (top-level scalar) → { inScope, status } like an always-in-scope applyTo', () => {
    const obligation = { id: 'o', status: 'optional' }
    const result = buildImplication(obligation, {
      isInScope: inScopeAlways,
      obligationsByCategory: new Map([['o', 'field']]),
      obligationApplicabilityDecisions: new Map(),
      fulfilmentIdsByObligationId: new Map(),
      amendedFulfilments: {}
    })
    expect(result).toEqual({ inScope: true, status: 'optional' })
  })

  it('derived-leaf → applyTo records × own status', () => {
    const obligation = { id: 'o', status: 'mandatory' }
    const result = buildImplication(obligation, {
      isInScope: inScopeAlways,
      obligationsByCategory: new Map([['o', 'derived-leaf']]),
      obligationApplicabilityDecisions: new Map([
        [
          'o',
          {
            inScope: true,
            reasons: [{ code: 'r' }],
            records: ['turbo', 'alloys']
          }
        ]
      ]),
      fulfilmentIdsByObligationId: new Map(),
      amendedFulfilments: {}
    })
    expect(result).toEqual({
      inScope: true,
      reasons: [{ code: 'r' }],
      records: [
        { fulfilmentId: 'turbo', status: 'mandatory' },
        { fulfilmentId: 'alloys', status: 'mandatory' }
      ]
    })
  })

  it('user-leaf → own storage keys × own status', () => {
    const obligation = { id: 'o', status: 'mandatory' }
    const result = buildImplication(obligation, {
      isInScope: inScopeAlways,
      obligationsByCategory: new Map([['o', 'user-leaf']]),
      obligationApplicabilityDecisions: new Map(),
      fulfilmentIdsByObligationId: new Map(),
      amendedFulfilments: { o: { 'd1/a1': {}, 'd1/a2': {} } }
    })
    expect(result.records).toEqual([
      { fulfilmentId: 'd1/a1', status: 'mandatory' },
      { fulfilmentId: 'd1/a2', status: 'mandatory' }
    ])
  })

  it('user-leaf with no storage → empty records array', () => {
    const obligation = { id: 'o', status: 'mandatory' }
    const result = buildImplication(obligation, {
      isInScope: inScopeAlways,
      obligationsByCategory: new Map([['o', 'user-leaf']]),
      obligationApplicabilityDecisions: new Map(),
      fulfilmentIdsByObligationId: new Map(),
      amendedFulfilments: {}
    })
    expect(result.records).toEqual([])
  })
})
