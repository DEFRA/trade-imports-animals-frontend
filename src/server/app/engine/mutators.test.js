import { SET_ID } from '../../../../test/fixtures/index.js'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import {
  appendEntryAt,
  removeEntryAt,
  reconcileEntriesAt,
  updateEntryAt
} from './index.js'
import { store } from './store.js'
import { configureRecords } from './persistence/records.js'
import { configureSession } from './persistence/session.js'
import { records as recordsStub } from '../services/persistence/records/stub/index.js'
import { session as sessionStub } from '../services/persistence/session/stub.js'
import { configureReadyForCheckYourAnswers } from './read.js'
import { assembleFulfilments } from '../bridge/assemble-fulfilments.js'
import { purgeFulfilments, wipeSet } from '../bridge/purge.js'
import { stubH, journeyRequest } from './test-support.js'
import {
  BOS_TAURUS,
  FELIS_CATUS
} from '../sets/live-animals/journeys/linear/features/commodities/search/test-support.js'

let journeyId
const buildRequest = () => journeyRequest(journeyId)
const answersNow = async () => (await store.get(journeyId)).answers
const wipeOf = (answers) => {
  const fulfilments = assembleFulfilments(answers)
  return wipeSet(fulfilments, purgeFulfilments(fulfilments))
}

const GOATS_CODE = '010420'

const line = (commodityCode, extra = {}) => ({
  commodityCode,
  speciesLatinName: BOS_TAURUS,
  numberOfAnimalsQuantity: '25',
  ...extra
})

const identifiersPath = (lineIndex) => [
  'commodityLines',
  lineIndex,
  'animalIdentifiers'
]

describe('mutators — storage is positional, purge is evaluator-authoritative', () => {
  beforeAll(() => {
    configureRecords(SET_ID, recordsStub)
    configureSession(SET_ID, sessionStub)
    configureReadyForCheckYourAnswers(SET_ID, () => false)
  })
  beforeEach(async () => {
    await store.clear()
    journeyId = (await store.create()).journeyId
  })

  describe('#appendEntryAt — mints the next index, stores positionally', () => {
    it('Should append a commodity line and persist it in positional order', async () => {
      const first = await appendEntryAt(
        buildRequest(),
        stubH(),
        ['commodityLines'],
        { commodityCode: '0102' }
      )
      expect(first).toBe(0)
      const second = await appendEntryAt(
        buildRequest(),
        stubH(),
        ['commodityLines'],
        { commodityCode: GOATS_CODE }
      )
      expect(second).toBe(1)
      expect((await answersNow()).commodityLines).toEqual([
        { commodityCode: '0102' },
        { commodityCode: GOATS_CODE }
      ])
    })
  })

  describe('#updateEntryAt — edits in place, siblings intact', () => {
    it('Should edit a line in place', async () => {
      await store.seedAnswers(journeyId, {
        commodityLines: [line('0102'), line(GOATS_CODE)]
      })
      await updateEntryAt(
        buildRequest(),
        stubH(),
        ['commodityLines'],
        0,
        line('0101')
      )
      const lines = (await answersNow()).commodityLines
      expect(lines[0].commodityCode).toBe('0101')
      expect(lines[1].commodityCode).toBe(GOATS_CODE)
    })
  })

  describe('#removeEntryAt — splices positionally, siblings intact', () => {
    it('Should remove a line by index', async () => {
      await store.seedAnswers(journeyId, {
        commodityLines: [line('0102'), line(GOATS_CODE)]
      })
      await removeEntryAt(buildRequest(), stubH(), ['commodityLines'], 0)
      expect(
        (await answersNow()).commodityLines.map((entry) => entry.commodityCode)
      ).toEqual([GOATS_CODE])
    })
  })

  describe('#appendEntryAt cap', () => {
    const cappedLine = () => ({
      commodityCode: '01061900',
      numberOfAnimalsQuantity: '2',
      animalIdentifiers: [
        { animalIdentifierPassport: 'UK-1' },
        { animalIdentifierPassport: 'UK-2' }
      ]
    })

    it('Should reject an append at the sibling-count cap', async () => {
      await store.seedAnswers(journeyId, { commodityLines: [cappedLine()] })
      const rejected = await appendEntryAt(
        buildRequest(),
        stubH(),
        identifiersPath(0),
        { animalIdentifierPassport: 'UK-3' }
      )
      expect(rejected).toBeNull()
      expect(
        (await answersNow()).commodityLines[0].animalIdentifiers
      ).toHaveLength(2)
    })
  })

  describe('#appendEntryAt — an empty appended entry is not persisted', () => {
    it('Should return index 0 and store no identifiers when appending an empty identifier entry', async () => {
      await store.seedAnswers(journeyId, {
        commodityLines: [{ commodityCode: '01061900', animalIdentifiers: [] }]
      })
      const index = await appendEntryAt(
        buildRequest(),
        stubH(),
        identifiersPath(0),
        {}
      )
      expect(index).toBe(0)
      expect(
        (await answersNow()).commodityLines[0].animalIdentifiers
      ).toBeUndefined()
    })
  })

  describe('#removeEntryAt — the purge is evaluator-authoritative', () => {
    it('Should let the evaluator purge a now-orphaned notification-level answer when the last triggering line is removed', async () => {
      await store.seedAnswers(journeyId, {
        containsUnweanedAnimals: 'no',
        commodityLines: [
          { commodityCode: '0102', speciesLatinName: BOS_TAURUS },
          { commodityCode: '01061900', speciesLatinName: FELIS_CATUS }
        ]
      })
      const afterRemoval = {
        containsUnweanedAnimals: 'no',
        commodityLines: [
          { commodityCode: '01061900', speciesLatinName: FELIS_CATUS }
        ]
      }
      expect(wipeOf(afterRemoval)).toContain('containsUnweanedAnimals')

      await removeEntryAt(buildRequest(), stubH(), ['commodityLines'], 0)
      const answers = await answersNow()
      expect(
        answers.commodityLines.map((entry) => entry.commodityCode)
      ).toEqual(['01061900'])
      expect('containsUnweanedAnimals' in answers).toBe(false)
    })
  })

  describe('#reconcileEntriesAt — multi-select sync + evaluator-authoritative purge', () => {
    const keyOf = (entry) => `${entry.commodityCode}|${entry.speciesLatinName}`
    const reconcileLines = (entries) =>
      reconcileEntriesAt(
        buildRequest(),
        stubH(),
        ['commodityLines'],
        keyOf,
        entries
      )

    it('Should sync the collection to the desired species set, preserving kept lines', async () => {
      await store.seedAnswers(journeyId, {
        commodityLines: [
          {
            commodityCode: '0102',
            speciesLatinName: BOS_TAURUS,
            numberOfAnimalsQuantity: '25',
            animalIdentifiers: [{ animalIdentifierEarTag: 'UK123456789012' }]
          }
        ]
      })
      await reconcileLines([
        { commodityCode: '0102', speciesLatinName: BOS_TAURUS },
        { commodityCode: '0102', speciesLatinName: 'Bison bison' }
      ])
      const lines = (await answersNow()).commodityLines
      expect(lines).toHaveLength(2)
      expect(lines[0].animalIdentifiers).toEqual([
        { animalIdentifierEarTag: 'UK123456789012' }
      ])
      expect(lines[1]).toEqual({
        commodityCode: '0102',
        speciesLatinName: 'Bison bison'
      })
    })

    it('Should run the evaluator as the wipe authority: deselecting the last triggering commodity destroys the dependent', async () => {
      await store.seedAnswers(journeyId, {
        containsUnweanedAnimals: 'no',
        commodityLines: [
          { commodityCode: '0102', speciesLatinName: BOS_TAURUS },
          { commodityCode: '01061900', speciesLatinName: FELIS_CATUS }
        ]
      })
      await reconcileLines([
        { commodityCode: '01061900', speciesLatinName: FELIS_CATUS }
      ])
      const answers = await answersNow()
      expect('containsUnweanedAnimals' in answers).toBe(false)
    })
  })
})
