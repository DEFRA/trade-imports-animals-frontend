import { describe, it, expect, beforeAll, afterAll } from 'vitest'

import { configureObligationSet } from './manifest.js'
import {
  ancestorChain,
  isGroup,
  leavesUnder,
  groupsFrom
} from './manifest-graph.js'

// Synthetic manifest — two-level nested collection with a scalar
// sibling, exercised without pulling in the live-animals set.

const line = { id: 'line-group', name: 'commodityLines' }
const unit = { id: 'unit-group', name: 'animalIdentifiers', within: line }
const passport = { id: 'passport', name: 'passport', within: unit }
const commoditySelection = {
  id: 'commoditySelection',
  name: 'commoditySelection',
  within: line
}
const topLevelScalar = { id: 'reasonForImport', name: 'reasonForImport' }

const syntheticSet = {
  obligations: [line, unit, passport, commoditySelection, topLevelScalar],
  groups: [line, unit]
}

describe('#manifest-graph', () => {
  beforeAll(() => {
    configureObligationSet(syntheticSet)
  })

  afterAll(() => {
    configureObligationSet(undefined)
  })

  describe('#ancestorChain', () => {
    it('returns an empty chain for a top-level obligation', () => {
      expect(ancestorChain(topLevelScalar)).toEqual([])
    })

    it('returns the parent group for a direct child', () => {
      expect(ancestorChain(commoditySelection)).toEqual([line])
    })

    it('returns root-to-parent order for a nested leaf', () => {
      expect(ancestorChain(passport)).toEqual([line, unit])
    })
  })

  describe('#isGroup', () => {
    it('is true for a group referenced by others via within', () => {
      expect(isGroup(line)).toBe(true)
      expect(isGroup(unit)).toBe(true)
    })

    it('is false for a leaf', () => {
      expect(isGroup(passport)).toBe(false)
      expect(isGroup(commoditySelection)).toBe(false)
      expect(isGroup(topLevelScalar)).toBe(false)
    })
  })

  describe('#leavesUnder', () => {
    it('collects leaves at every depth beneath the group', () => {
      expect(leavesUnder(line)).toEqual([passport, commoditySelection])
    })

    it('collects only leaves whose chain includes the given group', () => {
      expect(leavesUnder(unit)).toEqual([passport])
    })
  })

  describe('#groupsFrom', () => {
    it('includes the group itself plus every nested group', () => {
      expect(groupsFrom(line)).toEqual([line, unit])
    })

    it('includes only the group itself when nothing nests beneath it', () => {
      expect(groupsFrom(unit)).toEqual([unit])
    })
  })
})
