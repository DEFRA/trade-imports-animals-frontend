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
import { records as recordsStub } from '../services/persistence/records/stub.js'
import { session as sessionStub } from '../services/persistence/session/stub.js'
import { buildDispatch } from '../flow/dispatch.js'
import { dispatchPages } from '../features/index.js'
import { wipeSet } from '../bridge/purge.js'
import { stubH, journeyRequest } from './test-support.js'

// Mutator behaviour. Storage is positional (an array; the evaluator holds no
// instance record and infers instances from leaf composite prefixes), so every
// mutator's storage mechanic — index-minting, in-place `with`, `toSpliced`,
// key-matched reconcile — is a storage concern:
//   - append/update/remove/reconcile store positionally;
//   - append's cap rejection fires via `collectionCapAt` (`maxEntriesFrom`);
//   - an empty appended entry survives in storage even though the evaluator
//     cannot address it (no leaf → no evaluator instance);
//   - remove/reconcile route their purge to the evaluator (evaluator-authoritative
//     wipe of now-orphaned notification-level data).

let journeyId
const buildRequest = () => journeyRequest(journeyId)
const answersNow = async () => (await store.get(journeyId)).answers

const line = (commoditySelection, extra = {}) => ({
  commoditySelection,
  speciesSelection: '1148346',
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
    configureRecords(recordsStub)
    configureSession(sessionStub)
    buildDispatch(dispatchPages)
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
        { commoditySelection: 'Cow' }
      )
      expect(first).toBe(0)
      const second = await appendEntryAt(
        buildRequest(),
        stubH(),
        ['commodityLines'],
        { commoditySelection: '010420 - Goats' }
      )
      expect(second).toBe(1)
      expect((await answersNow()).commodityLines).toEqual([
        { commoditySelection: 'Cow' },
        { commoditySelection: '010420 - Goats' }
      ])
    })
  })

  describe('#updateEntryAt — edits in place, siblings intact', () => {
    it('Should edit a line in place', async () => {
      await store.seedAnswers(journeyId, {
        commodityLines: [line('Cow'), line('010420 - Goats')]
      })
      await updateEntryAt(
        buildRequest(),
        stubH(),
        ['commodityLines'],
        0,
        line('Horse')
      )
      const lines = (await answersNow()).commodityLines
      expect(lines[0].commoditySelection).toBe('Horse')
      expect(lines[1].commoditySelection).toBe('010420 - Goats')
    })
  })

  describe('#removeEntryAt — splices positionally, siblings intact', () => {
    it('Should remove a line by index', async () => {
      await store.seedAnswers(journeyId, {
        commodityLines: [line('Cow'), line('010420 - Goats')]
      })
      await removeEntryAt(buildRequest(), stubH(), ['commodityLines'], 0)
      expect(
        (await answersNow()).commodityLines.map(
          (entry) => entry.commoditySelection
        )
      ).toEqual(['010420 - Goats'])
    })
  })

  describe('#appendEntryAt cap — `maxEntriesFrom` fires', () => {
    const cappedLine = () => ({
      commoditySelection: 'Cat',
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
      expect(rejected).toBe(null)
      expect(
        (await answersNow()).commodityLines[0].animalIdentifiers
      ).toHaveLength(2)
    })
  })

  describe('#appendEntryAt — an empty appended entry is not persisted', () => {
    it('Should accept the ruled loss of a leaf-less unit the canonical evaluator cannot express', async () => {
      // No numberOfAnimalsQuantity → uncapped (blank-count semantics).
      await store.seedAnswers(journeyId, {
        commodityLines: [{ commoditySelection: 'Cat', animalIdentifiers: [] }]
      })
      const index = await appendEntryAt(
        buildRequest(),
        stubH(),
        identifiersPath(0),
        {}
      )
      expect(index).toBe(0)
      // The evaluator infers instances from leaf composite prefixes, so this
      expect(
        (await answersNow()).commodityLines[0].animalIdentifiers
      ).toBeUndefined()
    })
  })

  describe('#removeEntryAt — the purge is evaluator-authoritative', () => {
    it('Should let the evaluator purge a now-orphaned notification-level answer when the last triggering line is removed', async () => {
      // containsUnweanedAnimals is gated (frame:anyItem) on an unweaned-
      // triggering commodity (Cow) existing in ANY line, and carries wipeOnExit.
      await store.seedAnswers(journeyId, {
        containsUnweanedAnimals: 'no',
        commodityLines: [
          { commoditySelection: 'Cow', speciesSelection: '1148346' },
          { commoditySelection: 'Cat', speciesSelection: '923501' }
        ]
      })
      // After removing the Cow line, the evaluator owns the wipe decision.
      const afterRemoval = {
        containsUnweanedAnimals: 'no',
        commodityLines: [
          { commoditySelection: 'Cat', speciesSelection: '923501' }
        ]
      }
      expect(wipeSet(afterRemoval)).toContain('containsUnweanedAnimals')

      await removeEntryAt(buildRequest(), stubH(), ['commodityLines'], 0)
      const answers = await answersNow()
      expect(
        answers.commodityLines.map((entry) => entry.commoditySelection)
      ).toEqual(['Cat'])
      expect('containsUnweanedAnimals' in answers).toBe(false)
    })
  })

  describe('#reconcileEntriesAt — multi-select sync + evaluator-authoritative purge', () => {
    const keyOf = (entry) =>
      `${entry.commoditySelection}|${entry.speciesSelection}`
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
            commoditySelection: 'Cow',
            speciesSelection: '1148346',
            numberOfAnimalsQuantity: '25',
            animalIdentifiers: [{ animalIdentifierEarTag: 'UK123456789012' }]
          }
        ]
      })
      await reconcileLines([
        { commoditySelection: 'Cow', speciesSelection: '1148346' },
        { commoditySelection: 'Cow', speciesSelection: '716661' }
      ])
      const lines = (await answersNow()).commodityLines
      expect(lines).toHaveLength(2)
      // The kept line retains ALL its data — positional key-matched merge.
      expect(lines[0].animalIdentifiers).toEqual([
        { animalIdentifierEarTag: 'UK123456789012' }
      ])
      expect(lines[1]).toEqual({
        commoditySelection: 'Cow',
        speciesSelection: '716661'
      })
    })

    it('Should run the evaluator as the wipe authority: deselecting the last triggering commodity destroys the dependent', async () => {
      await store.seedAnswers(journeyId, {
        containsUnweanedAnimals: 'no',
        commodityLines: [
          { commoditySelection: 'Cow', speciesSelection: '1148346' },
          { commoditySelection: 'Cat', speciesSelection: '923501' }
        ]
      })
      await reconcileLines([
        { commoditySelection: 'Cat', speciesSelection: '923501' }
      ])
      const answers = await answersNow()
      expect('containsUnweanedAnimals' in answers).toBe(false)
    })
  })
})
