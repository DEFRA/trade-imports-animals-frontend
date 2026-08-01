import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import {
  appendEntryAt,
  commit,
  removeEntryAt,
  updateEntryAt
} from '../engine/index.js'
import { collectionCapAt } from '../engine/evaluate/cardinality.js'
import { collectionView } from '../engine/evaluate/collection-view.js'
import { configureRecords } from '../engine/persistence/records.js'
import { configureSession } from '../engine/persistence/session.js'
import { get } from '../engine/read.js'
import { store } from '../engine/store.js'
import { journeyRequest, recordingH, stubH } from '../engine/test-support.js'
import {
  buildDispatch,
  collectsOf,
  pageOfObligation,
  slugOfPage
} from '../flow/dispatch.js'
import { allowListed } from '../model/obligations/helpers/index.js'
import { configureObligationSet } from '../model/obligations/manifest.js'
import { groupInvariantErrors } from '../model/obligations/state-queries.js'
import { records as recordsStub } from '../services/persistence/records/stub/index.js'
import { session as sessionStub } from '../services/persistence/session/stub.js'
import { withSetContext } from '../shared/set-context.js'
import { assembleFulfilments } from './assemble-fulfilments.js'
import { entryComplete } from './collection-complete.js'
import { evaluateAnswers } from './evaluation.js'
import { feature, grouped } from './fulfilment-bindings.js'
import {
  configureFulfilmentRegistry,
  createFulfilmentRegistry,
  fulfilmentRegistry
} from './fulfilment-registry.js'
import { projectAnswers } from './fulfilments/index.js'
import { wipeSet } from './purge.js'
import { configureReadyForCheckYourAnswers } from './readiness-config.js'
import { rawInScope } from './scope.js'
import { FULFILLED, IN_PROGRESS, statusOf } from './status/index.js'

const setId = 'live-animals'

const lines = {
  id: '0ec201f3-7d40-4f35-aef7-a0fa27754d86',
  name: 'lines',
  requires: {
    minEntries: 1,
    errorCode: 'obligation.lines.required'
  }
}

const lineLabel = {
  id: '867444b9-02cb-4832-a87d-fdb25dc0e604',
  name: 'lineLabel',
  status: 'mandatory',
  within: lines
}

const species = {
  id: '34510fa5-dbc9-4875-bec5-833bb194ba50',
  name: 'species',
  within: lines,
  requires: {
    minEntries: 1,
    errorCode: 'obligation.species.required'
  }
}

const speciesCode = {
  id: 'cf471934-a75f-4672-a2bb-528fc43fa1f8',
  name: 'speciesCode',
  status: 'mandatory',
  within: species
}

const varieties = {
  id: 'b77be8c4-68c7-45d0-b1e8-9a034d1a88b9',
  name: 'varieties',
  within: species
}

const varietyName = {
  id: '4f26b799-24ca-44a0-8a35-e34f5788d0dd',
  name: 'varietyName',
  status: 'mandatory',
  within: varieties
}

const gradedSpecies = () => ['GRADED']
const gradeReason = {
  code: 'obligation.varietyGrade.applicable.becauseGradedSpecies',
  explanation: 'varietyGrade applies to varieties of graded species'
}

const varietyGrade = {
  id: '0570bb9e-aa26-4f05-bf71-c0340cfcb3cf',
  name: 'varietyGrade',
  status: 'mandatory',
  within: varieties,
  applyTo: allowListed(speciesCode, gradedSpecies, varieties, [gradeReason])
}

const obligations = [
  lines,
  lineLabel,
  species,
  speciesCode,
  varieties,
  varietyName,
  varietyGrade
]

const syntheticManifest = {
  obligations,
  groups: obligations.filter((obligation) =>
    obligations.some((other) => other.within === obligation)
  ),
  policy: {
    systemPopulated: [],
    enforcedAtContinue: [],
    maxEntriesFrom: {},
    systemAnswerKeys: []
  }
}

const lineD = { field: 'lines', token: 'line', obligation: lines }
const speciesD = {
  field: 'species',
  token: 'species',
  obligation: species
}
const varietyD = {
  field: 'varieties',
  token: 'variety',
  obligation: varieties
}

const bindings = feature('depth-three-fixture', [
  grouped({ field: 'lineLabel', obligation: lineLabel, groups: [lineD] }),
  grouped({
    field: 'speciesCode',
    obligation: speciesCode,
    groups: [lineD, speciesD]
  }),
  grouped({
    field: 'varietyName',
    obligation: varietyName,
    groups: [lineD, speciesD, varietyD]
  }),
  grouped({
    field: 'varietyGrade',
    obligation: varietyGrade,
    groups: [lineD, speciesD, varietyD]
  })
])

const pages = [
  { id: 'depth-three-page', slug: 'depth-three', collects: ['lines'] }
]

const variety = (name, grade = 'Class I') => ({
  varietyName: name,
  varietyGrade: grade
})

const speciesEntry = (code, varietyEntries = []) => ({
  speciesCode: code,
  varieties: varietyEntries
})

const line = (label, speciesEntries = []) => ({
  lineLabel: label,
  species: speciesEntries
})

const completeAnswers = {
  lines: [line('First', [speciesEntry('GRADED', [variety('Conference')])])]
}

let journeyId
const request = () => journeyRequest(journeyId)
const answersNow = async () => (await store.get(journeyId)).answers
const varietiesPath = (lineIndex, speciesIndex) => [
  'lines',
  lineIndex,
  'species',
  speciesIndex,
  'varieties'
]

beforeAll(() => {
  configureObligationSet(setId, syntheticManifest)
  configureFulfilmentRegistry(setId, [bindings])
  buildDispatch(setId, pages)
  configureRecords(setId, recordsStub)
  configureSession(setId, sessionStub)
  configureReadyForCheckYourAnswers(() => false)
})

beforeEach(async () => {
  await store.clear()
  journeyId = (await store.create()).journeyId
})

describe('depth-3 grouped-binding registration', () => {
  it('Should register the derived groups and surface the complete within chain', () => {
    expect(syntheticManifest.groups).toEqual([lines, species, varieties])
    expect(fulfilmentRegistry.ownerOf(varietyName.id)).toMatchObject({
      feature: bindings,
      binding: { groups: [lineD, speciesD, varietyD] }
    })
    expect([
      fulfilmentRegistry.groupDescriptorOf(lines.id),
      fulfilmentRegistry.groupDescriptorOf(species.id),
      fulfilmentRegistry.groupDescriptorOf(varieties.id)
    ]).toEqual([lineD, speciesD, varietyD])
  })

  it('Should reject a depth-2 binding that disagrees with a depth-3 within chain', () => {
    const mismatched = feature('depth-mismatch', [
      grouped({ field: 'lineLabel', obligation: lineLabel, groups: [lineD] }),
      grouped({
        field: 'speciesCode',
        obligation: speciesCode,
        groups: [lineD, speciesD]
      }),
      grouped({
        field: 'varietyName',
        obligation: varietyName,
        groups: [lineD, speciesD]
      }),
      grouped({
        field: 'varietyGrade',
        obligation: varietyGrade,
        groups: [lineD, speciesD, varietyD]
      })
    ])

    expect(() => createFulfilmentRegistry([mismatched], obligations)).toThrow(
      'Invalid fulfilment binding registry: binding path "lines[*].species[*].varietyName" has depth 2; varietyName requires depth 3'
    )
  })
})

describe('depth-3 dispatch coverage inheritance', () => {
  it('Should inherit every nested owner from the nearest registered ancestor', () => {
    expect(pageOfObligation('lines.species.speciesCode')).toBe(
      'depth-three-page'
    )
    expect(pageOfObligation('lines.species.varieties.varietyName')).toBe(
      'depth-three-page'
    )
    expect(
      pageOfObligation('lines[0].species[1].varieties[2].varietyGrade')
    ).toBe('depth-three-page')
    expect(slugOfPage('depth-three-page')).toBe('depth-three')
    expect(collectsOf('depth-three-page')).toEqual(['lines'])
  })

  it('Should reject a path metacharacter in a nested obligation name', () => {
    const unsafeSetId = 'depth-three-path-unsafe'
    const unsafeName = { ...varietyName, name: 'variety.name' }
    const unsafeObligations = obligations.map((obligation) =>
      obligation === varietyName ? unsafeName : obligation
    )
    configureObligationSet(unsafeSetId, {
      ...syntheticManifest,
      obligations: unsafeObligations,
      groups: syntheticManifest.groups
    })

    expect(() => buildDispatch(unsafeSetId, pages)).toThrow(
      'Obligation id "variety.name" (at lines.species.varieties.variety.name) contains a path metacharacter'
    )
  })
})

describe('depth-3 assembly, evaluation, cardinality and status', () => {
  it('Should assemble positional depth-3 ids and round-trip the answer tree used by check answers', () => {
    const fulfilments = assembleFulfilments(completeAnswers)

    expect(fulfilments).toEqual({
      [lineLabel.id]: { line0: 'First' },
      [speciesCode.id]: { 'line0/species0': 'GRADED' },
      [varietyName.id]: {
        'line0/species0/variety0': 'Conference'
      },
      [varietyGrade.id]: {
        'line0/species0/variety0': 'Class I'
      }
    })
    expect(projectAnswers(fulfilments)).toEqual(completeAnswers)
  })

  it('Should enforce the top-level lines floor', () => {
    const evaluation = evaluateAnswers({ lines: [] })

    expect(groupInvariantErrors(lines, evaluation)).toEqual([
      {
        code: 'MIN_ENTRIES',
        groupId: lines.id,
        groupName: 'lines',
        errorCode: 'obligation.lines.required',
        minEntries: 1,
        actual: 0
      }
    ])
  })

  it.fails(
    'Should enforce the species floor once for every line instance',
    () => {
      const evaluation = evaluateAnswers({
        lines: [line('First', [speciesEntry('GRADED')]), line('Second', [])]
      })

      expect(groupInvariantErrors(species, evaluation)).toEqual([
        expect.objectContaining({
          code: 'MIN_ENTRIES',
          groupName: 'species',
          instanceId: 'line1',
          actual: 0
        })
      ])
    }
  )

  it('Should leave the optional varieties group uncapped and complete when absent', () => {
    const answers = { lines: [line('First', [speciesEntry('GRADED')])] }
    const evaluation = evaluateAnswers(answers)

    expect(collectionCapAt(answers, varietiesPath(0, 0))).toBeNull()
    expect(entryComplete(evaluation, ['lines', 0, 'species'], 0)).toBe(true)
  })

  it('Should resolve maxEntriesFrom in the immediate species frame at depth 3', () => {
    const cappedSetId = 'depth-three-capped'
    configureObligationSet(cappedSetId, {
      ...syntheticManifest,
      policy: {
        ...syntheticManifest.policy,
        maxEntriesFrom: { varieties: 'speciesCode' }
      }
    })
    const answers = {
      lines: [line('First', [speciesEntry(2, [variety('Conference')])])]
    }

    expect(
      withSetContext(cappedSetId, () =>
        collectionCapAt(answers, varietiesPath(0, 0))
      )
    ).toBe(2)
  })

  it('Should derive an in-progress and fulfilled status through depth 3', () => {
    const partial = {
      lines: [
        line('First', [speciesEntry('GRADED', [{ varietyGrade: 'Class I' }])])
      ]
    }
    const partialEvaluation = evaluateAnswers(partial)
    const completeEvaluation = evaluateAnswers(completeAnswers)

    expect(
      statusOf(
        ['lines'],
        partial,
        rawInScope(partialEvaluation),
        partialEvaluation
      )
    ).toBe(IN_PROGRESS)
    expect(
      statusOf(
        ['lines'],
        completeAnswers,
        rawInScope(completeEvaluation),
        completeEvaluation
      )
    ).toBe(FULFILLED)
  })
})

describe('depth-3 path-addressed store operations', () => {
  it('Should append, update and remove varieties while preserving every sibling level', async () => {
    await store.seedAnswers(journeyId, {
      lines: [
        line('First', [
          speciesEntry('GRADED', [variety('Conference')]),
          speciesEntry('GRADED', [variety('Comice')])
        ]),
        line('Second', [speciesEntry('GRADED', [variety('Bosc')])])
      ]
    })

    expect(
      await appendEntryAt(
        request(),
        stubH(),
        varietiesPath(0, 0),
        variety('Williams')
      )
    ).toBe(1)
    await updateEntryAt(
      request(),
      stubH(),
      varietiesPath(0, 0),
      0,
      variety('Conference edited')
    )
    await removeEntryAt(request(), stubH(), varietiesPath(0, 0), 1)

    const answers = await answersNow()
    expect(answers.lines[0].species[0].varieties).toEqual([
      variety('Conference edited')
    ])
    expect(answers.lines[0].species[1].varieties).toEqual([variety('Comice')])
    expect(answers.lines[1].species[0].varieties).toEqual([variety('Bosc')])
  })

  it('Should ignore malformed and out-of-range target indices', async () => {
    await store.seedAnswers(journeyId, completeAnswers)

    await updateEntryAt(
      request(),
      stubH(),
      varietiesPath(0, 0),
      Number('bad'),
      variety('Wrong')
    )
    await removeEntryAt(request(), stubH(), varietiesPath(0, 0), 9)

    expect(await answersNow()).toEqual(completeAnswers)
  })

  it('Should persist canonical depth-3 answers in records and flow-only answers in session', async () => {
    const h = recordingH()
    await commit(request(), h, { ...completeAnswers, importType: 'animals' })
    const reloadedRequest = journeyRequest(journeyId, {
      state: { ...h.cookies }
    })
    const { answers } = await get(reloadedRequest, stubH())

    expect((await answersNow()).lines).toEqual(completeAnswers.lines)
    expect(answers).toMatchObject({
      ...completeAnswers,
      importType: 'animals'
    })
  })

  it.fails(
    'Should reject an out-of-range line parent without corrupting persistence',
    async () => {
      await store.seedAnswers(journeyId, completeAnswers)

      expect(
        await appendEntryAt(
          request(),
          stubH(),
          varietiesPath(5, 0),
          variety('Phantom line')
        )
      ).toBeNull()
      expect(await answersNow()).toEqual(completeAnswers)
    }
  )

  it.fails(
    'Should reject an out-of-range species parent without corrupting persistence',
    async () => {
      await store.seedAnswers(journeyId, completeAnswers)

      expect(
        await appendEntryAt(
          request(),
          stubH(),
          varietiesPath(0, 9),
          variety('Phantom species')
        )
      ).toBeNull()
      expect(await answersNow()).toEqual(completeAnswers)
    }
  )
})

describe('depth-3 per-instance scope and wipe', () => {
  it('Should scope grades to graded species and wipe only the out-of-scope field', () => {
    const answers = {
      lines: [
        line('First', [speciesEntry('GRADED', [variety('Conference')])]),
        line('Second', [speciesEntry('UNGRADED', [variety('Bosc')])])
      ]
    }
    const fulfilments = assembleFulfilments(answers)
    const evaluation = evaluateAnswers(answers)

    expect(evaluation.fulfilments[varietyGrade.id]).toEqual({
      'line0/species0/variety0': 'Class I'
    })
    expect(wipeSet(fulfilments, evaluation)).toEqual([
      'lines[1].species[0].varieties[0].varietyGrade'
    ])
    expect(projectAnswers(evaluation.fulfilments)).toEqual({
      lines: [
        line('First', [speciesEntry('GRADED', [variety('Conference')])]),
        line('Second', [speciesEntry('UNGRADED', [{ varietyName: 'Bosc' }])])
      ]
    })
  })
})

describe('depth-3 collection-complete rollup', () => {
  it('Should mark each variety incomplete without its name and complete when full', () => {
    const answers = {
      lines: [
        line('First', [
          speciesEntry('GRADED', [
            { varietyGrade: 'Class I' },
            variety('Conference')
          ])
        ])
      ]
    }
    const evaluation = evaluateAnswers(answers)
    const path = varietiesPath(0, 0)

    expect(entryComplete(evaluation, path, 0)).toBe(false)
    expect(entryComplete(evaluation, path, 1)).toBe(true)
  })

  it('Should return facts-only collection rows with the stored entry references', () => {
    const answers = structuredClone(completeAnswers)
    const path = varietiesPath(0, 0)
    const view = collectionView(answers, path, evaluateAnswers(answers))

    expect(view).toEqual([
      {
        index: 0,
        path: [...path, 0],
        entry: answers.lines[0].species[0].varieties[0],
        complete: true
      }
    ])
    expect(view[0].entry).toBe(answers.lines[0].species[0].varieties[0])
  })

  it.fails(
    'Should roll a missing nested species collection up as an incomplete line',
    () => {
      const answers = { lines: [line('First')] }
      const evaluation = evaluateAnswers(answers)

      expect(entryComplete(evaluation, ['lines'], 0)).toBe(false)
    }
  )

  it('Should keep a fully empty variety absent from evaluator enumeration but incomplete in the positional view', () => {
    const answers = {
      lines: [line('First', [speciesEntry('GRADED', [{}])])]
    }
    const evaluation = evaluateAnswers(answers)

    expect(evaluation.obligations[varieties.id].records).toEqual([])
    expect(collectionView(answers, varietiesPath(0, 0), evaluation)).toEqual([
      {
        index: 0,
        path: [...varietiesPath(0, 0), 0],
        entry: answers.lines[0].species[0].varieties[0],
        complete: false
      }
    ])
  })
})
