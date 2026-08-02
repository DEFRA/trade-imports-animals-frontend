import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { assembleFulfilments } from '../../../../../bridge/assemble-fulfilments.js'
import { entryComplete } from '../../../../../bridge/collection-complete.js'
import { evaluateAnswers } from '../../../../../bridge/evaluation.js'
import { feature, grouped } from '../../../../../bridge/fulfilment-bindings.js'
import {
  configureFulfilmentRegistry,
  createFulfilmentRegistry,
  fulfilmentRegistry
} from '../../../../../bridge/fulfilment-registry.js'
import { projectAnswers } from '../../../../../bridge/fulfilments/index.js'
import { wipeSet } from '../../../../../bridge/purge.js'
import { configureReadyForCheckYourAnswers } from '../../../../../bridge/readiness-config.js'
import {
  appendEntryAt,
  removeEntryAt,
  updateEntryAt
} from '../../../../../engine/index.js'
import { configureRecords } from '../../../../../engine/persistence/records.js'
import { configureSession } from '../../../../../engine/persistence/session.js'
import { store } from '../../../../../engine/store.js'
import { journeyRequest, stubH } from '../../../../../engine/test-support.js'
import {
  buildDispatch,
  collectsOf,
  pageOfObligation
} from '../../../../../flow/dispatch.js'
import { configureObligationSet } from '../../../../../model/obligations/manifest.js'
import { assertNoDisplayKeys } from '../../../../../model/no-display-keys.js'
import { records as recordsStub } from '../../../../../services/persistence/records/stub/index.js'
import { session as sessionStub } from '../../../../../services/persistence/session/stub.js'
import {
  evaluationBindings,
  lineGroup,
  speciesGroup,
  varietyGroup
} from '../../../journeys/linear/features/commodities/evaluation.js'
import { classApplicableSpecies } from '../../../services/commodities/index.js'
import { obligations as livePlantObligations } from '../../index.js'
import { commodityInputMethod } from './input-method.js'
import {
  commodityLines,
  commoditySelection,
  controlledAtmosphereContainer,
  finishedOrPropagated,
  intendedForFinalUsers,
  netWeight,
  numberOfPackages,
  packageType,
  quantity,
  quantityType,
  testAndTrial
} from './lines.js'
import { eppoCode, genusAndSpecies, species, speciesId } from './species.js'
import { varieties, variety, varietyClass } from './varieties.js'

// Vitest's global setup mounts only this id; configuring the isolated fixture
// under it preserves the sole-mounted-set fallback used by pp-012's harness.
const setId = 'live-animals'

const lineLeaves = [
  commoditySelection,
  numberOfPackages,
  packageType,
  quantity,
  quantityType,
  netWeight,
  controlledAtmosphereContainer,
  finishedOrPropagated,
  intendedForFinalUsers,
  testAndTrial
]
const speciesLeaves = [eppoCode, genusAndSpecies, speciesId]
const varietyLeaves = [variety, varietyClass]
const commodityObligations = [
  commodityLines,
  ...lineLeaves,
  species,
  ...speciesLeaves,
  varieties,
  ...varietyLeaves
]
const commodityGroups = commodityObligations.filter((obligation) =>
  commodityObligations.some((other) => other.within === obligation)
)

const fixtureManifest = {
  obligations: [commodityInputMethod, ...commodityObligations],
  groups: commodityGroups,
  policy: {
    systemPopulated: [],
    enforcedAtContinue: [],
    maxEntriesFrom: {},
    systemAnswerKeys: []
  }
}

const pages = [
  {
    id: 'fixture-input-method-owner',
    slug: 'fixture-input-method-owner',
    collects: ['commodityInputMethod']
  },
  {
    id: 'fixture-commodity-owner',
    slug: 'fixture-commodity-owner',
    collects: ['commodityLines']
  }
]

const varietyEntry = (id, varietyClassValue = 'CLASS_I') => ({
  variety: id,
  varietyClass: varietyClassValue
})

const speciesEntry = (code, genus, varietiesEntries = [], id = undefined) => ({
  eppoCode: code,
  genusAndSpecies: genus,
  ...(id === undefined ? {} : { speciesId: id }),
  varieties: varietiesEntries
})

const lineEntry = (selection, speciesEntries = []) => ({
  commoditySelection: selection,
  numberOfPackages: 2,
  packageType: 'BX',
  quantity: 12,
  quantityType: 'PCS',
  netWeight: 8.5,
  controlledAtmosphereContainer: false,
  finishedOrPropagated: 'FINISHED',
  intendedForFinalUsers: true,
  testAndTrial: false,
  species: speciesEntries
})

const citrus = (varietyEntries = [varietyEntry('NONE')]) =>
  speciesEntry('CIDAC', 'Citrus australasica', varietyEntries, '1364882')

const apple = (varietyEntries = [{ variety: 'apple-variety' }]) =>
  speciesEntry('MABSD', 'Malus domestica', varietyEntries, '1391442')

const completeAnswers = {
  commodityLines: [lineEntry('08059000', [citrus()])]
}

const varietiesPath = (lineIndex, speciesIndex) => [
  'commodityLines',
  lineIndex,
  'species',
  speciesIndex,
  'varieties'
]

let journeyId
const request = () => journeyRequest(journeyId)
const answersNow = async () => (await store.get(journeyId)).answers

beforeAll(() => {
  configureObligationSet(setId, fixtureManifest)
  configureFulfilmentRegistry(setId, [evaluationBindings])
  buildDispatch(setId, pages)
  configureRecords(setId, recordsStub)
  configureSession(setId, sessionStub)
  configureReadyForCheckYourAnswers(() => false)
})

beforeEach(async () => {
  await store.clear()
  journeyId = (await store.create()).journeyId
})

describe('real plant-products depth-3 commodity model', () => {
  it('registers the real objects, identities, groups and lazy class gate', () => {
    expect(commodityObligations).toHaveLength(18)
    expect(commodityObligations.map(({ name }) => name)).toEqual([
      'commodityLines',
      'commoditySelection',
      'numberOfPackages',
      'packageType',
      'quantity',
      'quantityType',
      'netWeight',
      'controlledAtmosphereContainer',
      'finishedOrPropagated',
      'intendedForFinalUsers',
      'testAndTrial',
      'species',
      'eppoCode',
      'genusAndSpecies',
      'speciesId',
      'varieties',
      'variety',
      'varietyClass'
    ])
    expect(new Set(commodityObligations.map(({ id }) => id))).toHaveLength(18)
    expect(
      commodityObligations.every(({ id }) =>
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
          id
        )
      )
    ).toBe(true)
    expect(commodityObligations.every(({ name }) => !/[.[\]]/.test(name))).toBe(
      true
    )
    expect(
      commodityObligations.every((obligation) =>
        livePlantObligations.includes(obligation)
      )
    ).toBe(true)
    expect(() => assertNoDisplayKeys(commodityObligations)).not.toThrow()
    expect(evaluationBindings.bindings.map(({ field }) => field)).toEqual([
      'commodityInputMethod',
      'commoditySelection',
      'numberOfPackages',
      'packageType',
      'quantity',
      'quantityType',
      'netWeight',
      'controlledAtmosphereContainer',
      'finishedOrPropagated',
      'intendedForFinalUsers',
      'testAndTrial',
      'eppoCode',
      'genusAndSpecies',
      'speciesId',
      'variety',
      'varietyClass'
    ])
    expect(commodityGroups).toEqual([commodityLines, species, varieties])
    expect(species.within).toBe(commodityLines)
    expect(varieties.within).toBe(species)
    expect(lineLeaves.every((leaf) => leaf.within === commodityLines)).toBe(
      true
    )
    expect(speciesLeaves.every((leaf) => leaf.within === species)).toBe(true)
    expect(varietyLeaves.every((leaf) => leaf.within === varieties)).toBe(true)
    expect(varietyClass.applyTo.metadata).toMatchObject({
      type: 'allowListed',
      obligation: eppoCode.id,
      projection: varieties.id
    })
    const firstLazyList = varietyClass.applyTo.metadata.values
    const secondLazyList = varietyClass.applyTo.metadata.values
    expect(firstLazyList).toEqual(classApplicableSpecies())
    expect(secondLazyList).toEqual(firstLazyList)
    expect(secondLazyList).not.toBe(firstLazyList)
    expect(fulfilmentRegistry.groupDescriptorOf(commodityLines.id)).toEqual(
      lineGroup
    )
    expect(fulfilmentRegistry.groupDescriptorOf(species.id)).toEqual(
      speciesGroup
    )
    expect(fulfilmentRegistry.groupDescriptorOf(varieties.id)).toEqual(
      varietyGroup
    )
  })

  it('rejects a string within reference instead of treating it as identity', () => {
    const stringWithinSelection = {
      ...commoditySelection,
      within: 'commodityLines'
    }
    const stringManifest = commodityObligations.map((obligation) =>
      obligation === commoditySelection ? stringWithinSelection : obligation
    )
    const stringBinding = feature('string-within', [
      grouped({
        field: 'commoditySelection',
        obligation: stringWithinSelection,
        groups: [lineGroup]
      })
    ])

    expect(() =>
      createFulfilmentRegistry([stringBinding], stringManifest)
    ).toThrow('does not match the manifest within chain')
  })

  it('rejects a varieties leaf binding whose chain is only depth 2', () => {
    const mismatched = feature(
      'depth-mismatch',
      evaluationBindings.bindings.map((binding) =>
        binding.obligation === variety
          ? grouped({
              field: binding.field,
              obligation: binding.obligation,
              groups: [lineGroup, speciesGroup]
            })
          : binding
      )
    )

    expect(() =>
      createFulfilmentRegistry(
        [mismatched],
        [commodityInputMethod, ...commodityObligations]
      )
    ).toThrow(
      'binding path "commodityLines[*].species[*].variety" has depth 2; variety requires depth 3'
    )
  })
})

describe('real depth-3 path-addressed writes', () => {
  it('appends, updates and removes a variety with snapshot-local renumbering', async () => {
    await store.seedAnswers(journeyId, {
      commodityLines: [
        lineEntry('08059000', [
          citrus([varietyEntry('first'), varietyEntry('second')]),
          apple([{ variety: 'apple-sibling' }])
        ]),
        lineEntry('08059000', [citrus([varietyEntry('line-sibling')])])
      ]
    })

    expect(
      await appendEntryAt(
        request(),
        stubH(),
        varietiesPath(0, 0),
        varietyEntry('third')
      )
    ).toBe(2)
    await updateEntryAt(
      request(),
      stubH(),
      varietiesPath(0, 0),
      0,
      varietyEntry('first-edited')
    )
    await removeEntryAt(request(), stubH(), varietiesPath(0, 0), 1)

    const answers = await answersNow()
    expect(answers.commodityLines[0].species[0].varieties).toEqual([
      varietyEntry('first-edited'),
      varietyEntry('third')
    ])
    expect(answers.commodityLines[0].species[1].varieties).toEqual([
      { variety: 'apple-sibling' }
    ])
    expect(answers.commodityLines[1].species[0].varieties).toEqual([
      varietyEntry('line-sibling')
    ])
    expect(assembleFulfilments(answers)[variety.id]).toMatchObject({
      'line0/species0/variety0': 'first-edited',
      'line0/species0/variety1': 'third'
    })
  })

  it('refuses out-of-range and non-integer indices at both parent levels', async () => {
    await store.seedAnswers(journeyId, completeAnswers)

    expect(
      await appendEntryAt(
        request(),
        stubH(),
        varietiesPath(5, 0),
        varietyEntry('phantom-line')
      )
    ).toBeNull()
    expect(
      await appendEntryAt(
        request(),
        stubH(),
        varietiesPath(0, 9),
        varietyEntry('phantom-species')
      )
    ).toBeNull()
    expect(
      await appendEntryAt(
        request(),
        stubH(),
        varietiesPath(Number.NaN, 0),
        varietyEntry('non-integer-line')
      )
    ).toBeNull()
    expect(
      await appendEntryAt(
        request(),
        stubH(),
        varietiesPath(0, 0.5),
        varietyEntry('non-integer-species')
      )
    ).toBeNull()
    expect(await answersNow()).toEqual(completeAnswers)
  })
})

describe('real depth-3 scope, completeness and dispatch', () => {
  it('scopes and wipes varietyClass per species instance without touching a sibling', () => {
    const answers = {
      commodityLines: [
        lineEntry('08059000', [citrus([varietyEntry('first')])]),
        lineEntry('08059000', [citrus([varietyEntry('sibling')])])
      ]
    }
    const changed = structuredClone(answers)
    changed.commodityLines[0].species[0].eppoCode = 'MABSD'
    changed.commodityLines[0].species[0].genusAndSpecies = 'Malus domestica'
    const evaluation = evaluateAnswers(changed)

    expect(wipeSet(assembleFulfilments(changed), evaluation)).toEqual([
      'commodityLines[0].species[0].varieties[0].varietyClass'
    ])
    expect(projectAnswers(evaluation.fulfilments)).toEqual({
      commodityLines: [
        {
          ...changed.commodityLines[0],
          species: [
            {
              ...changed.commodityLines[0].species[0],
              varieties: [{ variety: 'first' }]
            }
          ]
        },
        changed.commodityLines[1]
      ]
    })
  })

  it('rolls species floors and optional or incomplete varieties into line completeness', () => {
    const noSpecies = { commodityLines: [lineEntry('08059000')] }
    const noVarieties = {
      commodityLines: [lineEntry('08059000', [citrus([])])]
    }
    const incompleteVariety = {
      commodityLines: [
        lineEntry('08059000', [citrus([{ varietyClass: 'CLASS_I' }])])
      ]
    }

    expect(
      entryComplete(evaluateAnswers(noSpecies), ['commodityLines'], 0)
    ).toBe(false)
    expect(
      entryComplete(evaluateAnswers(noVarieties), ['commodityLines'], 0)
    ).toBe(true)
    expect(
      entryComplete(evaluateAnswers(incompleteVariety), ['commodityLines'], 0)
    ).toBe(false)
    expect(
      entryComplete(evaluateAnswers(completeAnswers), ['commodityLines'], 0)
    ).toBe(true)
  })

  it('inherits the fixture owner for every group and leaf at all three depths', () => {
    const paths = [
      'commodityLines',
      ...lineLeaves.map(({ name }) => `commodityLines[0].${name}`),
      'commodityLines[0].species',
      ...speciesLeaves.map(
        ({ name }) => `commodityLines[0].species[1].${name}`
      ),
      'commodityLines[0].species[1].varieties',
      ...varietyLeaves.map(
        ({ name }) => `commodityLines[0].species[1].varieties[2].${name}`
      )
    ]

    expect(paths.map((path) => pageOfObligation(path))).toEqual(
      paths.map(() => 'fixture-commodity-owner')
    )
    expect(collectsOf('fixture-commodity-owner')).toEqual(['commodityLines'])
  })
})
