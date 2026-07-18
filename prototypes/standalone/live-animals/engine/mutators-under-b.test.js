import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
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
import { configureReadyForCheckYourAnswers } from './read.js'
import { readyForCheckYourAnswers } from '../flow/section-status.js'
import { buildDispatch } from '../flow/dispatch.js'
import { dispatchPages } from '../features/index.js'
import { wipeSetFromB } from '../model/bridge/purge.js'
import { stubH, journeyRequest } from './test-support.js'

// inc-015 — mutator behaviour under MODEL=a|b.
//
// A owns storage under BOTH flags (positional array; B holds no instance
// record and infers instances from leaf composite prefixes). So every mutator's
// storage mechanic — index-minting, in-place `with`, `toSpliced`, key-matched
// reconcile — is A-side and flag-identical. inc-013 already dual-pathed the only
// model judgment on the write path (the purge, shared by commit/remove/
// reconcile); inc-014 ruled the append cap A-side under both flags
// (`maxEntriesFrom`, no B channel, deferred to inc-024a). These tests prove each
// mutator behaves correctly under `b` without any new dual-pathing:
//   - append/update/remove/reconcile store positionally, byte-identical under
//     both flags (instance identity is positional);
//   - append's cap rejection fires under `b` via A's `collectionCapAt`;
//   - an empty appended entry survives in A's storage under `b` even though B
//     cannot address it (no leaf → no B instance);
//   - remove/reconcile route their purge to B under `b` (B-authoritative wipe of
//     now-orphaned notification-level data).
// Env hygiene: `process.env.MODEL` is saved/restored so the flag never leaks.

let journeyId
let savedModel
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

describe('mutators under MODEL=a|b — storage is A-positional, purge is flag-selected', () => {
  beforeAll(() => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    buildDispatch(dispatchPages)
    configureReadyForCheckYourAnswers(readyForCheckYourAnswers)
  })
  beforeEach(async () => {
    savedModel = process.env.MODEL
    await store.clear()
    journeyId = (await store.create()).journeyId
  })
  afterEach(() => {
    if (savedModel === undefined) delete process.env.MODEL
    else process.env.MODEL = savedModel
  })

  describe.each(['a', 'b'])(
    'appendEntryAt under MODEL=%s — mints the next index, stores positionally',
    (model) => {
      it('Should append a commodity line and persist it in A order regardless of flag', async () => {
        process.env.MODEL = model
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
    }
  )

  describe.each(['a', 'b'])(
    'updateEntryAt under MODEL=%s — edits in place, siblings intact',
    (model) => {
      it('Should edit a line in place under either flag', async () => {
        process.env.MODEL = model
        await store.saveAnswers(journeyId, {
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
    }
  )

  describe.each(['a', 'b'])(
    'removeEntryAt under MODEL=%s — splices positionally, siblings intact',
    (model) => {
      it('Should remove a line by index under either flag', async () => {
        process.env.MODEL = model
        await store.saveAnswers(journeyId, {
          commodityLines: [line('Cow'), line('010420 - Goats')]
        })
        await removeEntryAt(buildRequest(), stubH(), ['commodityLines'], 0)
        expect(
          (await answersNow()).commodityLines.map((e) => e.commoditySelection)
        ).toEqual(['010420 - Goats'])
      })
    }
  )

  describe('appendEntryAt cap — A-side `maxEntriesFrom` fires under BOTH flags (inc-014)', () => {
    const cappedLine = () => ({
      commoditySelection: 'Cat',
      numberOfAnimalsQuantity: '2',
      animalIdentifiers: [
        { animalIdentifierPassport: 'UK-1' },
        { animalIdentifierPassport: 'UK-2' }
      ]
    })

    it.each(['a', 'b'])(
      'Should reject an append at the sibling-count cap under MODEL=%s',
      async (model) => {
        process.env.MODEL = model
        await store.saveAnswers(journeyId, { commodityLines: [cappedLine()] })
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
      }
    )
  })

  describe('appendEntryAt under MODEL=b — an empty appended entry survives in A storage', () => {
    it('Should hold an empty unit A cannot express in B — positional identity, not B-addressability, owns storage', async () => {
      process.env.MODEL = 'b'
      // No numberOfAnimalsQuantity → uncapped (ruled blank-count semantics).
      await store.saveAnswers(journeyId, {
        commodityLines: [{ commoditySelection: 'Cat', animalIdentifiers: [] }]
      })
      const index = await appendEntryAt(
        buildRequest(),
        stubH(),
        identifiersPath(0),
        {}
      )
      expect(index).toBe(0)
      // B infers instances from leaf composite prefixes, so this leaf-less unit
      // produces NO B fulfilment — B cannot address it. A's positional array
      // still holds it verbatim.
      expect((await answersNow()).commodityLines[0].animalIdentifiers).toEqual([
        {}
      ])
    })
  })

  describe('removeEntryAt under MODEL=b — the purge is B-authoritative', () => {
    it('Should let B purge a now-orphaned notification-level answer when the last triggering line is removed', async () => {
      process.env.MODEL = 'b'
      // containsUnweanedAnimals is gated (frame:anyItem) on an unweaned-
      // triggering commodity (Cow) existing in ANY line, and carries wipeOnExit.
      await store.saveAnswers(journeyId, {
        containsUnweanedAnimals: 'no',
        commodityLines: [
          { commoditySelection: 'Cow', speciesSelection: '1148346' },
          { commoditySelection: 'Cat', speciesSelection: '923501' }
        ]
      })
      // After removing the Cow line, B's evaluator owns the wipe decision.
      const afterRemoval = {
        containsUnweanedAnimals: 'no',
        commodityLines: [
          { commoditySelection: 'Cat', speciesSelection: '923501' }
        ]
      }
      expect(wipeSetFromB(afterRemoval)).toContain('containsUnweanedAnimals')

      await removeEntryAt(buildRequest(), stubH(), ['commodityLines'], 0)
      const answers = await answersNow()
      expect(answers.commodityLines.map((e) => e.commoditySelection)).toEqual([
        'Cat'
      ])
      expect('containsUnweanedAnimals' in answers).toBe(false)
    })
  })

  describe('reconcileEntriesAt under MODEL=b — multi-select sync + B-authoritative purge', () => {
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
      process.env.MODEL = 'b'
      await store.saveAnswers(journeyId, {
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

    it('Should run B as the wipe authority: deselecting the last triggering commodity destroys the dependent', async () => {
      process.env.MODEL = 'b'
      await store.saveAnswers(journeyId, {
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
