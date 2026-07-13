/**
 * Unit-level invariants on the derived commodity-lines lists. These
 * are the guards that go with Fix #1 / #2 from the second code review:
 * we want the /lines summary AND Delete to walk exactly the depth-1
 * leaves the flow presents per-line, with no groups sneaking in.
 */

import { describe, it, expect } from 'vitest'

import { LINE_PAGES, LINE_LEAF_OBLIGATIONS } from './controller.js'
import {
  commodityLine,
  unitRecord,
  commodityCode,
  commodityType,
  species,
  numberOfAnimals,
  numberOfPackages,
  obligations as v4Obligations
} from '../../obligations/obligations.js'

describe('commodity-lines derived lists', () => {
  it('LINE_PAGES pairs every presentsForEach page in commodity-lines-details with its obligation', () => {
    const names = LINE_PAGES.map((p) => p.pageName)
    expect(names).toEqual([
      'commodity-details',
      'commodity-type',
      'species-details',
      'number-of-animals',
      'number-of-packages'
    ])
    expect(LINE_PAGES.map((p) => p.obligation.name)).toEqual([
      'commodityCode',
      'commodityType',
      'species',
      'numberOfAnimals',
      'numberOfPackages'
    ])
  })

  it('LINE_LEAF_OBLIGATIONS covers exactly the depth-1 leaves — no groups', () => {
    // Regression: the old filter used `within === commodityLine`,
    // which pulled in `unitRecord` (a nested GROUP whose `within` is
    // also `commodityLine`). Groups have no fulfilments keyed by
    // lineId, so at best they were harmless no-ops in Delete — but
    // shipping the wrong invariant would bite the moment unitRecord
    // instances started being tracked in state.
    expect(LINE_LEAF_OBLIGATIONS).toContain(commodityCode)
    expect(LINE_LEAF_OBLIGATIONS).toContain(commodityType)
    expect(LINE_LEAF_OBLIGATIONS).toContain(species)
    expect(LINE_LEAF_OBLIGATIONS).toContain(numberOfAnimals)
    expect(LINE_LEAF_OBLIGATIONS).toContain(numberOfPackages)
    // The one that MUST NOT be there — it's the nested group.
    expect(LINE_LEAF_OBLIGATIONS).not.toContain(unitRecord)
    // Every entry must have a `status` — that's the manifest's
    // distinguishing marker between a leaf and a structural group.
    for (const o of LINE_LEAF_OBLIGATIONS) {
      expect(o.status, `${o.name} should be a leaf (has status)`).toBeDefined()
    }
  })

  it('LINE_LEAF_OBLIGATIONS stays in lock-step with LINE_PAGES', () => {
    expect(LINE_LEAF_OBLIGATIONS).toEqual(LINE_PAGES.map((p) => p.obligation))
  })

  it('every depth-1 leaf in the manifest is presented on a per-line page', () => {
    // If a new `within: commodityLine` leaf ever lands without a
    // presentsForEach page in commodity-lines-details, this test
    // fires so the flow gets updated at the same time.
    const depth1Leaves = v4Obligations.filter(
      (o) => o.within === commodityLine && o.status !== undefined
    )
    const presentedNames = new Set(LINE_PAGES.map((p) => p.obligation.name))
    for (const leaf of depth1Leaves) {
      expect(
        presentedNames.has(leaf.name),
        `${leaf.name} is a depth-1 leaf but has no per-line page`
      ).toBe(true)
    }
  })
})
