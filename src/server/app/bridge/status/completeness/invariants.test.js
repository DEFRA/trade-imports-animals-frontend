import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { configureObligationSet } from '../../../model/obligations/manifest.js'
import {
  allowListed,
  equalsGate
} from '../../../model/obligations/helpers/index.js'
import { emptyCollectionSatisfiesFloor } from './invariants.js'

// Synthetic manifest — a commodity line holding a unit-record group whose
// floor is an `anyOfIds` rule, so the floor can be exercised without pulling
// in the live-animals set.

const line = { id: 'line-group', name: 'commodityLines' }

const commoditySelection = {
  id: 'commodity-selection',
  name: 'commoditySelection',
  within: line,
  status: 'mandatory'
}

// The shape the identifier leaves really carry: an allowlist read of the
// line's commodity, fanned onto the unit-record group.
const allowListedLeaf = {
  id: 'allow-listed-leaf',
  name: 'allowListedLeaf',
  status: 'optional',
  applyTo: allowListed(commoditySelection, ['Cow'], { id: 'unit-group' })
}

// A shape `gateAdmits` cannot read: no `values`, no gated parent group.
const equalsGateLeaf = {
  id: 'equals-gate-leaf',
  name: 'equalsGateLeaf',
  status: 'optional',
  applyTo: equalsGate(
    commoditySelection,
    'Cow',
    { inScope: true },
    { inScope: false }
  )
}

// An allowlist gate fanned onto some other group: read against this group's
// parent index it would be answering a different question.
const fannedElsewhereLeaf = {
  id: 'elsewhere-leaf',
  name: 'elsewhereLeaf',
  status: 'optional',
  applyTo: allowListed(commoditySelection, ['Cow'], { id: 'other-group' })
}

const unitGroupWith = (anyOfIds) => ({
  id: 'unit-group',
  name: 'animalIdentifiers',
  within: line,
  requires: { anyOfIds, errorCode: 'unit.identifierRequired' }
})

const collection = { requiredAtLeastOne: true }

const LINE_1 = 'line1'

const stateWithCommodity = (value) => ({
  fulfilments: { [commoditySelection.id]: { [LINE_1]: value } }
})

describe('#emptyCollectionSatisfiesFloor', () => {
  beforeAll(() => {
    configureObligationSet({
      obligations: [
        commoditySelection,
        allowListedLeaf,
        equalsGateLeaf,
        fannedElsewhereLeaf
      ],
      groups: [line]
    })
  })

  afterAll(() => {
    configureObligationSet(undefined)
  })

  it('Should hold the floor open where the collection asks for no entry at all', () => {
    expect(
      emptyCollectionSatisfiesFloor(
        { requiredAtLeastOne: false },
        unitGroupWith([allowListedLeaf.id]),
        LINE_1,
        stateWithCommodity('Cow')
      )
    ).toBe(true)
  })

  it('Should bite where a readable gate admits the parent — the line is asked for a record', () => {
    expect(
      emptyCollectionSatisfiesFloor(
        collection,
        unitGroupWith([allowListedLeaf.id]),
        LINE_1,
        stateWithCommodity('Cow')
      )
    ).toBe(false)
  })

  it('Should go vacuous where a readable gate admits nothing on this parent', () => {
    expect(
      emptyCollectionSatisfiesFloor(
        collection,
        unitGroupWith([allowListedLeaf.id]),
        LINE_1,
        stateWithCommodity('Fish')
      )
    ).toBe(true)
  })

  // `gateAdmits` reads `metadata.values`, which only the allowlist shapes
  // define. Judged by that alone an equals/present/includes/branched gate
  // looks like a leaf that can never apply, and the mandatory floor would
  // silently go vacuous — an empty collection reported satisfied and the
  // notification submittable. A shape this helper cannot read must keep the
  // floor biting instead.
  it('Should keep the floor biting for a leaf gated by a shape it cannot read', () => {
    expect(
      emptyCollectionSatisfiesFloor(
        collection,
        unitGroupWith([equalsGateLeaf.id]),
        LINE_1,
        stateWithCommodity('Fish')
      )
    ).toBe(false)
  })

  // The same guard covers a gate fanned onto some other group.
  it('Should keep the floor biting for a gate fanned onto a different group', () => {
    expect(
      emptyCollectionSatisfiesFloor(
        collection,
        unitGroupWith([fannedElsewhereLeaf.id]),
        LINE_1,
        stateWithCommodity('Fish')
      )
    ).toBe(false)
  })
})
