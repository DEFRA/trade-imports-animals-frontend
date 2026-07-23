import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import {
  appendEntryAt,
  commit,
  reconcileEntriesAt,
  removeEntryAt,
  updateEntryAt
} from './engine/index.js'
import { store } from './engine/store.js'
import { records, configureRecords } from './engine/persistence/records.js'
import { configureSession } from './engine/persistence/session.js'
import { records as recordsStub } from './services/persistence/records/stub.js'
import { session as sessionStub } from './services/persistence/session/stub.js'
import { configureReadyForCheckYourAnswers } from './engine/read.js'
import { stubH, journeyRequest } from './engine/test-support.js'
import { buildDispatch } from './flow/dispatch.js'
import { readyForCheckYourAnswers } from './flow/section-status.js'
import { dispatchPages } from './features/index.js'

let journeyId
const buildRequest = () => journeyRequest(journeyId)
const answersNow = async () => (await store.get(journeyId)).answers

const line = (commoditySelection, extra = {}) => ({
  commoditySelection,
  speciesSelection: '1148346',
  numberOfAnimalsQuantity: '25',
  ...extra
})

const setupJourneyEngine = () => {
  beforeAll(() => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    buildDispatch(dispatchPages)
    configureReadyForCheckYourAnswers(readyForCheckYourAnswers)
  })
  beforeEach(async () => {
    await store.clear()
    journeyId = (await store.create()).journeyId
  })
}

describe('path-addressed store ops at depth-1 (commodityLines — live carrier)', () => {
  setupJourneyEngine()

  it('Should append a commodity line, minting the next index and persisting it', async () => {
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

  it('Should edit a commodity line in place, leaving siblings intact', async () => {
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
    expect((await answersNow()).commodityLines[0].commoditySelection).toBe(
      'Horse'
    )
    expect((await answersNow()).commodityLines[1].commoditySelection).toBe(
      '010420 - Goats'
    )
  })

  it('Should remove a commodity line in place, leaving siblings intact', async () => {
    await store.saveAnswers(journeyId, {
      commodityLines: [line('Cow'), line('010420 - Goats')]
    })
    await removeEntryAt(buildRequest(), stubH(), ['commodityLines'], 0)
    expect(
      (await answersNow()).commodityLines.map(
        (entry) => entry.commoditySelection
      )
    ).toEqual(['010420 - Goats'])
  })

  it('Should ignore a non-integer index on remove (a malformed URL must not destroy instance 0)', async () => {
    await store.saveAnswers(journeyId, {
      commodityLines: [line('Cow'), line('010420 - Goats')]
    })
    await removeEntryAt(
      buildRequest(),
      stubH(),
      ['commodityLines'],
      Number('foo')
    )
    expect(
      (await answersNow()).commodityLines.map(
        (entry) => entry.commoditySelection
      )
    ).toEqual(['Cow', '010420 - Goats'])
  })

  it('Should ignore an out-of-range index on remove', async () => {
    await store.saveAnswers(journeyId, {
      commodityLines: [line('Cow')]
    })
    await removeEntryAt(buildRequest(), stubH(), ['commodityLines'], 5)
    expect((await answersNow()).commodityLines).toEqual([line('Cow')])
  })

  it('Should ignore a non-integer index on update', async () => {
    await store.saveAnswers(journeyId, {
      commodityLines: [line('Cow')]
    })
    await updateEntryAt(
      buildRequest(),
      stubH(),
      ['commodityLines'],
      Number('foo'),
      line('Fish')
    )
    expect((await answersNow()).commodityLines).toEqual([line('Cow')])
  })

  it('Should ignore an out-of-range index on update', async () => {
    await store.saveAnswers(journeyId, {
      commodityLines: [line('Cow')]
    })
    await updateEntryAt(
      buildRequest(),
      stubH(),
      ['commodityLines'],
      5,
      line('Fish')
    )
    expect((await answersNow()).commodityLines).toEqual([line('Cow')])
  })

  it('Should write through a commit that mutates a line, re-running reconcile and destroying the now-out-of-scope package count at its exact path', async () => {
    await store.saveAnswers(journeyId, {
      commodityLines: [line('Cow', { numberOfPackages: '5' })]
    })
    await commit(buildRequest(), stubH(), {
      commodityLines: [line('Fish', { numberOfPackages: '5' })]
    })
    const persisted = (await records.load({ journeyId })).answers
    expect(persisted.commodityLines[0].commoditySelection).toBe('Fish')
    expect('numberOfPackages' in persisted.commodityLines[0]).toBe(false)
  })

  it('Should preserve an in-scope package count when a commit leaves the line on the list', async () => {
    await store.saveAnswers(journeyId, {
      commodityLines: [line('Cow', { numberOfPackages: '5' })]
    })
    await commit(buildRequest(), stubH(), {
      commodityLines: [line('Cow', { numberOfPackages: '9' })]
    })
    expect(
      (await records.load({ journeyId })).answers.commodityLines[0]
    ).toEqual(line('Cow', { numberOfPackages: '9' }))
  })
})

describe('batch reconcile (reconcileEntriesAt — the species-grain create)', () => {
  setupJourneyEngine()

  const keyOf = (entry) =>
    `${entry.commoditySelection}|${entry.speciesSelection}`
  const seed = (commoditySelection, speciesSelection) => ({
    commoditySelection,
    speciesSelection,
    numberOfPackages: '',
    numberOfAnimalsQuantity: ''
  })
  const reconcileLines = (entries) =>
    reconcileEntriesAt(
      buildRequest(),
      stubH(),
      ['commodityLines'],
      keyOf,
      entries
    )

  it('Should create one line per desired entry, in the desired order', async () => {
    await reconcileLines([
      seed('Cow', '1148346'),
      seed('Cow', '716661'),
      seed('Cat', '923501')
    ])
    expect((await answersNow()).commodityLines.map(keyOf)).toEqual([
      'Cow|1148346',
      'Cow|716661',
      'Cat|923501'
    ])
  })

  it("Should keep ALL of an existing line's data when its species stays selected — per-line quantities and nested identifiers survive the reconcile", async () => {
    await store.saveAnswers(journeyId, {
      commodityLines: [
        {
          commoditySelection: 'Cow',
          speciesSelection: '1148346',
          numberOfPackages: '5',
          numberOfAnimalsQuantity: '25',
          animalIdentifiers: [{ animalIdentifierEarTag: 'UK123456789012' }]
        }
      ]
    })
    await reconcileLines([seed('Cow', '1148346'), seed('Cow', '716661')])
    const lines = (await answersNow()).commodityLines
    expect(lines).toHaveLength(2)
    expect(lines[0]).toEqual({
      commoditySelection: 'Cow',
      speciesSelection: '1148346',
      numberOfPackages: '5',
      numberOfAnimalsQuantity: '25',
      animalIdentifiers: [{ animalIdentifierEarTag: 'UK123456789012' }]
    })
    expect(lines[1]).toEqual(seed('Cow', '716661'))
  })

  it("Should remove a deselected species' line entirely — deselect wipes the line and its nested records", async () => {
    await store.saveAnswers(journeyId, {
      commodityLines: [
        {
          commoditySelection: 'Cow',
          speciesSelection: '1148346',
          numberOfAnimalsQuantity: '25',
          animalIdentifiers: [{ animalIdentifierEarTag: 'UK123456789012' }]
        },
        {
          commoditySelection: 'Cat',
          speciesSelection: '923501',
          numberOfAnimalsQuantity: '2'
        }
      ]
    })
    await reconcileLines([seed('Cat', '923501')])
    const lines = (await answersNow()).commodityLines
    expect(lines).toHaveLength(1)
    expect(lines[0].commoditySelection).toBe('Cat')
    expect(lines[0].numberOfAnimalsQuantity).toBe('2')
  })

  it('Should run the scope-and-wipe pass: dropping the last triggering commodity destroys the dependent notification-level answer', async () => {
    // containsUnweanedAnimals is gated on an unweaned-triggering commodity
    // (Cow) existing in ANY line (frame:anyItem) and carries wipeOnExit.
    await store.saveAnswers(journeyId, {
      containsUnweanedAnimals: 'no',
      commodityLines: [
        { commoditySelection: 'Cow', speciesSelection: '1148346' },
        { commoditySelection: 'Cat', speciesSelection: '923501' }
      ]
    })
    await reconcileLines([seed('Cat', '923501')])
    const answers = await answersNow()
    expect('containsUnweanedAnimals' in answers).toBe(false)
  })
})

describe('path-addressed store ops at depth-2 (commodityLines[i].animalIdentifiers)', () => {
  setupJourneyEngine()

  const identifiersPath = (lineIndex) => [
    'commodityLines',
    lineIndex,
    'animalIdentifiers'
  ]
  const catsLine = (units = []) => ({
    commoditySelection: 'Cat',
    animalIdentifiers: units
  })
  const address = { name: 'Owner', address: { addressLine1: '1 Farm Lane' } }

  it('Should append a unit into a specific line, minting the nested index and persisting it', async () => {
    await store.saveAnswers(journeyId, {
      commodityLines: [catsLine(), catsLine()]
    })
    const first = await appendEntryAt(
      buildRequest(),
      stubH(),
      identifiersPath(1),
      { animalIdentifierPassport: 'UK-1' }
    )
    expect(first).toBe(0)
    const second = await appendEntryAt(
      buildRequest(),
      stubH(),
      identifiersPath(1),
      { animalIdentifierPassport: 'UK-2' }
    )
    expect(second).toBe(1)
    expect((await answersNow()).commodityLines[0].animalIdentifiers).toEqual([])
    expect(
      (await answersNow()).commodityLines[1].animalIdentifiers.map(
        (unit) => unit.animalIdentifierPassport
      )
    ).toEqual(['UK-1', 'UK-2'])
  })

  it('Should edit a unit in place at depth-2, leaving sibling units intact', async () => {
    await store.saveAnswers(journeyId, {
      commodityLines: [
        catsLine([
          { animalIdentifierPassport: 'UK-1' },
          { animalIdentifierPassport: 'UK-2' }
        ])
      ]
    })
    await updateEntryAt(buildRequest(), stubH(), identifiersPath(0), 0, {
      animalIdentifierPassport: 'UK-1-edited'
    })
    expect(
      (await answersNow()).commodityLines[0].animalIdentifiers.map(
        (unit) => unit.animalIdentifierPassport
      )
    ).toEqual(['UK-1-edited', 'UK-2'])
  })

  it('Should remove a unit in place at depth-2, leaving sibling units intact', async () => {
    await store.saveAnswers(journeyId, {
      commodityLines: [
        catsLine([
          { animalIdentifierPassport: 'UK-1' },
          { animalIdentifierPassport: 'UK-2' }
        ])
      ]
    })
    await removeEntryAt(buildRequest(), stubH(), identifiersPath(0), 0)
    expect(
      (await answersNow()).commodityLines[0].animalIdentifiers.map(
        (unit) => unit.animalIdentifierPassport
      )
    ).toEqual(['UK-2'])
  })

  it('Should ignore a non-integer nested index on remove (a malformed URL must not destroy unit 0)', async () => {
    await store.saveAnswers(journeyId, {
      commodityLines: [catsLine([{ animalIdentifierPassport: 'UK-1' }])]
    })
    await removeEntryAt(
      buildRequest(),
      stubH(),
      identifiersPath(0),
      Number('foo')
    )
    expect(
      (await answersNow()).commodityLines[0].animalIdentifiers.map(
        (unit) => unit.animalIdentifierPassport
      )
    ).toEqual(['UK-1'])
  })

  it('Should ignore an out-of-range nested index on update', async () => {
    await store.saveAnswers(journeyId, {
      commodityLines: [catsLine([{ animalIdentifierPassport: 'UK-1' }])]
    })
    await updateEntryAt(buildRequest(), stubH(), identifiersPath(0), 5, {
      animalIdentifierPassport: 'UK-X'
    })
    expect(
      (await answersNow()).commodityLines[0].animalIdentifiers[0]
        .animalIdentifierPassport
    ).toBe('UK-1')
  })

  it('Should reject an append at the cardinality cap — records never exceed the sibling animal count', async () => {
    await store.saveAnswers(journeyId, {
      commodityLines: [
        {
          commoditySelection: 'Cat',
          numberOfAnimalsQuantity: '2',
          animalIdentifiers: [
            { animalIdentifierPassport: 'UK-1' },
            { animalIdentifierPassport: 'UK-2' }
          ]
        }
      ]
    })
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

  it('Should append below the cap, minting the next index as before', async () => {
    await store.saveAnswers(journeyId, {
      commodityLines: [
        {
          commoditySelection: 'Cat',
          numberOfAnimalsQuantity: '2',
          animalIdentifiers: [{ animalIdentifierPassport: 'UK-1' }]
        }
      ]
    })
    const index = await appendEntryAt(
      buildRequest(),
      stubH(),
      identifiersPath(0),
      { animalIdentifierPassport: 'UK-2' }
    )
    expect(index).toBe(1)
    expect(
      (await answersNow()).commodityLines[0].animalIdentifiers
    ).toHaveLength(2)
  })

  it('Should apply NO cap while the sibling count is unanswered — the ruled blank-count semantics (the floor still bites at submit)', async () => {
    await store.saveAnswers(journeyId, {
      commodityLines: [
        {
          commoditySelection: 'Cat',
          numberOfAnimalsQuantity: '',
          animalIdentifiers: [{ animalIdentifierPassport: 'UK-1' }]
        }
      ]
    })
    const index = await appendEntryAt(
      buildRequest(),
      stubH(),
      identifiersPath(0),
      { animalIdentifierPassport: 'UK-2' }
    )
    expect(index).toBe(1)
  })

  it('Should apply NO cap for a non-integer count value — garbage never blocks the append', async () => {
    await store.saveAnswers(journeyId, {
      commodityLines: [
        {
          commoditySelection: 'Cat',
          numberOfAnimalsQuantity: 'many',
          animalIdentifiers: [{ animalIdentifierPassport: 'UK-1' }]
        }
      ]
    })
    const index = await appendEntryAt(
      buildRequest(),
      stubH(),
      identifiersPath(0),
      { animalIdentifierPassport: 'UK-2' }
    )
    expect(index).toBe(1)
  })

  it("Should resolve the cap per frame — one line at its cap never blocks a sibling line's append", async () => {
    await store.saveAnswers(journeyId, {
      commodityLines: [
        {
          commoditySelection: 'Cat',
          numberOfAnimalsQuantity: '1',
          animalIdentifiers: [{ animalIdentifierPassport: 'UK-1' }]
        },
        {
          commoditySelection: 'Cat',
          numberOfAnimalsQuantity: '2',
          animalIdentifiers: [{ animalIdentifierPassport: 'UK-2' }]
        }
      ]
    })
    expect(
      await appendEntryAt(buildRequest(), stubH(), identifiersPath(0), {
        animalIdentifierPassport: 'UK-X'
      })
    ).toBe(null)
    expect(
      await appendEntryAt(buildRequest(), stubH(), identifiersPath(1), {
        animalIdentifierPassport: 'UK-3'
      })
    ).toBe(1)
  })

  it('Should leave a collection WITHOUT the cardinality link uncapped — commodityLines appends stay unbounded', async () => {
    await store.saveAnswers(journeyId, {
      commodityLines: [line('Cow', { numberOfAnimalsQuantity: '1' })]
    })
    const index = await appendEntryAt(
      buildRequest(),
      stubH(),
      ['commodityLines'],
      line('Cat')
    )
    expect(index).toBe(1)
  })

  it('Should destroy a nested permanentAddress at its exact depth-2 path when the enclosing commodity leaves the gate', async () => {
    await store.saveAnswers(journeyId, {
      commodityLines: [
        catsLine([
          { animalIdentifierPassport: 'UK-1', permanentAddress: address }
        ])
      ]
    })
    await commit(buildRequest(), stubH(), {
      commodityLines: [
        {
          commoditySelection: 'Horse',
          animalIdentifiers: [
            { animalIdentifierPassport: 'UK-1', permanentAddress: address }
          ]
        }
      ]
    })
    const persisted = (await records.load({ journeyId })).answers
    const unit = persisted.commodityLines[0].animalIdentifiers[0]
    expect(unit.animalIdentifierPassport).toBe('UK-1')
    expect('permanentAddress' in unit).toBe(false)
  })
})
