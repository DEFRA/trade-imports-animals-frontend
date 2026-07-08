import { describe, expect, it } from 'vitest'
import { reconcile } from './reconcile.js'
import { evalPredicate } from './predicate.js'

/**
 * The inc-031 model-extension: `activatedBy.frame` grows scope resolution from
 * two cases (same-frame sibling / top-level answer) to four, adding
 * `frame: "enclosing"` and `frame: "anyItem"`. No live obligation carries a
 * frame gate yet — the pages that use it (permanentAddress, the unit-level
 * identifiers, countyParishHoldingCph, containsUnweanedAnimals) arrive in
 * inc-033..035 — so these specs prove the SCOPE + WIPE invariant with
 * synthetic obligations, injected via reconcile's test-only `forest` seam.
 * The shape mirrors the real one: a `commodityLines` collection whose items
 * hold `commoditySelection` and a nested `animalIdentifiers` collection.
 */

const commoditySelection = { id: 'commoditySelection' }

// A unit-level field gated on the ENCLOSING commodity line's selection —
// mirrors permanentAddress (required, wiped on exit).
const permanentAddress = {
  id: 'permanentAddress',
  required: true,
  wipeOnExit: true,
  activatedBy: {
    obligation: commoditySelection,
    frame: 'enclosing',
    includes: ['cat', 'dog', 'ferret']
  }
}

const animalIdentifiers = {
  id: 'animalIdentifiers',
  collection: true,
  item: [permanentAddress]
}

const commodityLines = {
  id: 'commodityLines',
  collection: true,
  item: [commoditySelection, animalIdentifiers]
}

// A notification-level field gated on ANY commodity line's selection —
// mirrors countyParishHoldingCph.
const countyParishHoldingCph = {
  id: 'countyParishHoldingCph',
  required: true,
  wipeOnExit: true,
  activatedBy: {
    obligation: commoditySelection,
    frame: 'anyItem',
    includes: ['cph']
  }
}

const forest = [commodityLines, countyParishHoldingCph]

const line = (selection, address) => ({
  commoditySelection: selection,
  animalIdentifiers: [{ permanentAddress: address }]
})

describe('cross-frame conditionality — frame: "enclosing" (unit gated on its commodity line)', () => {
  it('Should scope the unit field per instance from its OWN enclosing line, with no leak between siblings', () => {
    const { inScope } = reconcile(
      { commodityLines: [line('cat', 'addr-A'), line('horse', 'addr-B')] },
      forest
    )
    expect(
      inScope.has('commodityLines[0].animalIdentifiers[0].permanentAddress')
    ).toBe(true)
    expect(
      inScope.has('commodityLines[1].animalIdentifiers[0].permanentAddress')
    ).toBe(false)
  })

  it('Should wipe ONLY the off-line unit field, at its exact path, leaving the on-line untouched', () => {
    const { wiped } = reconcile(
      { commodityLines: [line('cat', 'addr-A'), line('horse', 'addr-B')] },
      forest
    )
    expect(wiped).toContain(
      'commodityLines[1].animalIdentifiers[0].permanentAddress'
    )
    expect(wiped).not.toContain(
      'commodityLines[0].animalIdentifiers[0].permanentAddress'
    )
  })

  it('Should destroy line-0 unit data (not hide it) when line-0 gate flips off, line-1 now in scope and untouched', () => {
    const { inScope, wiped } = reconcile(
      { commodityLines: [line('horse', 'addr-A'), line('cat', 'addr-B')] },
      forest
    )
    expect(wiped).toContain(
      'commodityLines[0].animalIdentifiers[0].permanentAddress'
    )
    expect(wiped).not.toContain(
      'commodityLines[1].animalIdentifiers[0].permanentAddress'
    )
    expect(
      inScope.has('commodityLines[1].animalIdentifiers[0].permanentAddress')
    ).toBe(true)
    expect(
      inScope.has('commodityLines[0].animalIdentifiers[0].permanentAddress')
    ).toBe(false)
  })
})

describe('cross-frame conditionality — frame: "anyItem" (notification field gated across all lines)', () => {
  it('Should place the notification field in scope when ANY line selects a triggering commodity', () => {
    const { inScope } = reconcile(
      {
        commodityLines: [line('other', 'a'), line('cph', 'b'), line('x', 'c')]
      },
      forest
    )
    expect(inScope.has('countyParishHoldingCph')).toBe(true)
  })

  it('Should keep the notification field OUT of scope when no line triggers it', () => {
    const { inScope } = reconcile(
      { commodityLines: [line('other', 'a'), line('x', 'c')] },
      forest
    )
    expect(inScope.has('countyParishHoldingCph')).toBe(false)
  })

  it('Should wipe the notification field when the last triggering line changes away', () => {
    const { wiped } = reconcile(
      {
        commodityLines: [line('other', 'a'), line('x', 'c')],
        countyParishHoldingCph: '123456789'
      },
      forest
    )
    expect(wiped).toContain('countyParishHoldingCph')
  })
})

/**
 * Depth-2 "two frames out": an enclosing reference must skip the intervening
 * frame and resolve in the nearest ancestor frame that actually holds it —
 * here a top-level flag read from inside a doubly-nested collection.
 */
describe('cross-frame conditionality — enclosing resolves two frames out', () => {
  const rootFlag = { id: 'rootFlag' }
  const deepField = {
    id: 'deepField',
    wipeOnExit: true,
    activatedBy: { obligation: rootFlag, frame: 'enclosing', equals: 'yes' }
  }
  const inner = { id: 'inner', collection: true, item: [deepField] }
  const outer = { id: 'outer', collection: true, item: [inner] }
  const depth2Forest = [rootFlag, outer]

  it('Should activate the depth-2 field from a root-frame flag two frames out', () => {
    const { inScope } = reconcile(
      { rootFlag: 'yes', outer: [{ inner: [{ deepField: 'v' }] }] },
      depth2Forest
    )
    expect(inScope.has('outer[0].inner[0].deepField')).toBe(true)
  })

  it('Should wipe the depth-2 field at its exact path when the root flag turns off', () => {
    const { inScope, wiped } = reconcile(
      { rootFlag: 'no', outer: [{ inner: [{ deepField: 'v' }] }] },
      depth2Forest
    )
    expect(inScope.has('outer[0].inner[0].deepField')).toBe(false)
    expect(wiped).toContain('outer[0].inner[0].deepField')
  })
})

/**
 * Backwards compatibility: the DEFAULT (no `frame`) resolution is unchanged —
 * a same-frame sibling reads inside the entry, anything else reads the
 * top-level answer. (The full pre-M2 suite over the real registry is the
 * primary witness; this pins the two default branches directly.)
 */
describe('activatedBy resolution — default (no frame) is unchanged', () => {
  const sibling = { id: 'sibling' }
  const frames = [
    { framePath: ['coll', 0], siblings: [sibling] },
    { framePath: [], siblings: [] }
  ]

  it('Should resolve a same-frame sibling inside the entry frame', () => {
    const activatedBy = { obligation: sibling, equals: 'yes' }
    const answers = { coll: [{ sibling: 'yes' }] }
    expect(evalPredicate(activatedBy, answers, frames)).toBe(true)
    expect(
      evalPredicate(activatedBy, { coll: [{ sibling: 'no' }] }, frames)
    ).toBe(false)
  })

  it('Should resolve a non-sibling reference as a top-level answer', () => {
    const topLevel = { id: 'topLevel' }
    const activatedBy = { obligation: topLevel, equals: 'yes' }
    expect(evalPredicate(activatedBy, { topLevel: 'yes' }, frames)).toBe(true)
  })
})

describe('activatedBy resolution — frame reference not found is not activated', () => {
  it('Should treat an enclosing reference absent from every enclosing frame as out of scope', () => {
    const ghost = { id: 'ghost' }
    const frames = [
      { framePath: ['a', 0], siblings: [] },
      { framePath: [], siblings: [] }
    ]
    expect(
      evalPredicate(
        { obligation: ghost, frame: 'enclosing', present: true },
        {},
        frames
      )
    ).toBe(false)
  })

  it('Should treat an anyItem reference with no matching collection as out of scope', () => {
    const ghost = { id: 'ghost' }
    const frames = [{ framePath: [], siblings: [] }]
    expect(
      evalPredicate(
        { obligation: ghost, frame: 'anyItem', present: true },
        {},
        frames
      )
    ).toBe(false)
  })
})
