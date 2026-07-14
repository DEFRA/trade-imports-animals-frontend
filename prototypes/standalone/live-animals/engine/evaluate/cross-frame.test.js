import { describe, expect, it } from 'vitest'
import { reconcile } from './reconcile.js'
import { evalPredicate, includesUnion } from './predicate.js'
import { entryComplete } from './complete.js'
import { destroyWiped } from '../../lib/path.js'

const commoditySelection = { id: 'commoditySelection' }

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

describe('negated cross-frame gating — notInUnionOf (inc-040)', () => {
  const typedPassport = {
    id: 'typedPassport',
    wipeOnExit: true,
    activatedBy: {
      obligation: commoditySelection,
      frame: 'enclosing',
      includes: ['horse', 'cow']
    }
  }
  const typedEarTag = {
    id: 'typedEarTag',
    wipeOnExit: true,
    activatedBy: {
      obligation: commoditySelection,
      frame: 'enclosing',
      includes: ['cow']
    }
  }
  const fallbackDetails = {
    id: 'fallbackDetails',
    wipeOnExit: true,
    activatedBy: {
      obligation: commoditySelection,
      frame: 'enclosing',
      notInUnionOf: [typedPassport, typedEarTag]
    }
  }
  const units = {
    id: 'units',
    collection: true,
    item: [typedPassport, typedEarTag, fallbackDetails],
    requiredAtLeastOne: true,
    requiredOneOf: ['typedPassport', 'typedEarTag', 'fallbackDetails']
  }
  const lines = {
    id: 'lines',
    collection: true,
    item: [commoditySelection, units]
  }
  const negatedForest = [lines]

  const lineWith = (selection, unit) => ({
    commoditySelection: selection,
    units: [unit]
  })

  it('Should derive the union from EVERY referenced includes list, not just the first', () => {
    expect(includesUnion([typedPassport, typedEarTag])).toEqual([
      'horse',
      'cow'
    ])
    const inScopeFor = (selection) =>
      reconcile(
        { lines: [lineWith(selection, { fallbackDetails: 'free text' })] },
        negatedForest
      ).inScope.has('lines[0].units[0].fallbackDetails')
    expect(inScopeFor('horse')).toBe(false)
    expect(inScopeFor('cow')).toBe(false)
    expect(inScopeFor('bee')).toBe(true)
  })

  it('Should scope the fallback per instance with no leak between sibling lines', () => {
    const { inScope } = reconcile(
      {
        lines: [
          lineWith('bee', { fallbackDetails: 'hive mark' }),
          lineWith('cow', { typedEarTag: 'UK1' })
        ]
      },
      negatedForest
    )
    expect(inScope.has('lines[0].units[0].fallbackDetails')).toBe(true)
    expect(inScope.has('lines[1].units[0].fallbackDetails')).toBe(false)
    expect(inScope.has('lines[1].units[0].typedEarTag')).toBe(true)
    expect(inScope.has('lines[0].units[0].typedEarTag')).toBe(false)
  })

  it('Should NOT activate the fallback while the gating obligation is unanswered (activation stays positive)', () => {
    const { inScope } = reconcile(
      { lines: [lineWith('', { fallbackDetails: 'free text' })] },
      negatedForest
    )
    expect(inScope.has('lines[0].units[0].fallbackDetails')).toBe(false)
  })

  it('Should wipe a stale fallback at its exact path when the commodity moves INTO the union, leaving the typed value untouched', () => {
    const { wiped } = reconcile(
      {
        lines: [
          lineWith('cow', { typedEarTag: 'UK1', fallbackDetails: 'stale' })
        ]
      },
      negatedForest
    )
    expect(wiped).toContain('lines[0].units[0].fallbackDetails')
    expect(wiped).not.toContain('lines[0].units[0].typedEarTag')
  })

  it('Should stop a wiped stale fallback satisfying the requiredOneOf group (wipeOnExit is the guard)', () => {
    const answers = {
      lines: [lineWith('cow', { fallbackDetails: 'stale free text' })]
    }
    expect(entryComplete(units, answers.lines[0].units[0])).toBe(true)
    const { wiped } = reconcile(answers, negatedForest)
    destroyWiped(answers, wiped)
    expect(entryComplete(units, answers.lines[0].units[0])).toBe(false)
  })

  it('Should resolve the negated gate two frames out (depth-2 enclosing)', () => {
    const deepFallback = {
      id: 'deepFallback',
      wipeOnExit: true,
      activatedBy: {
        obligation: commoditySelection,
        frame: 'enclosing',
        notInUnionOf: [typedPassport, typedEarTag]
      }
    }
    const inner = { id: 'inner', collection: true, item: [deepFallback] }
    const outer = {
      id: 'outer',
      collection: true,
      item: [commoditySelection, inner]
    }
    const depth2Forest = [outer]
    const at = (selection) =>
      reconcile(
        {
          outer: [
            { commoditySelection: selection, inner: [{ deepFallback: 'v' }] }
          ]
        },
        depth2Forest
      )
    expect(at('bee').inScope.has('outer[0].inner[0].deepFallback')).toBe(true)
    expect(at('cow').inScope.has('outer[0].inner[0].deepFallback')).toBe(false)
    expect(at('cow').wiped).toContain('outer[0].inner[0].deepFallback')
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
