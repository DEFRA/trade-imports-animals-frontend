import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import {
  appendEntryAt,
  commit,
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
const answersNow = () => store.get(journeyId).answers

const line = (commoditySelection, extra = {}) => ({
  commoditySelection,
  typeSelection: 'domestic',
  speciesSelection: ['bos-taurus'],
  numberOfAnimalsQuantity: '25',
  ...extra
})

describe('path-addressed store ops at depth-1 (commodityLines — live carrier)', () => {
  beforeAll(() => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    buildDispatch(dispatchPages)
    configureReadyForCheckYourAnswers(readyForCheckYourAnswers)
  })
  beforeEach(() => {
    store.clear()
    journeyId = store.create().journeyId
  })

  it('Should append a commodity line, minting the next index and persisting it', async () => {
    const first = await appendEntryAt(
      buildRequest(),
      stubH(),
      ['commodityLines'],
      { commoditySelection: '0102 - Cattle' }
    )
    expect(first).toBe(0)
    const second = await appendEntryAt(
      buildRequest(),
      stubH(),
      ['commodityLines'],
      { commoditySelection: '010420 - Goats' }
    )
    expect(second).toBe(1)
    expect(answersNow().commodityLines).toEqual([
      { commoditySelection: '0102 - Cattle' },
      { commoditySelection: '010420 - Goats' }
    ])
  })

  it('Should edit a commodity line in place, leaving siblings intact', async () => {
    store.saveAnswers(journeyId, {
      commodityLines: [line('0102 - Cattle'), line('010420 - Goats')]
    })
    await updateEntryAt(
      buildRequest(),
      stubH(),
      ['commodityLines'],
      0,
      line('0101 - Horse')
    )
    expect(answersNow().commodityLines[0].commoditySelection).toBe(
      '0101 - Horse'
    )
    expect(answersNow().commodityLines[1].commoditySelection).toBe(
      '010420 - Goats'
    )
  })

  it('Should remove a commodity line in place, leaving siblings intact', async () => {
    store.saveAnswers(journeyId, {
      commodityLines: [line('0102 - Cattle'), line('010420 - Goats')]
    })
    await removeEntryAt(buildRequest(), stubH(), ['commodityLines'], 0)
    expect(
      answersNow().commodityLines.map((entry) => entry.commoditySelection)
    ).toEqual(['010420 - Goats'])
  })

  it('Should ignore a non-integer index on remove (a malformed URL must not destroy instance 0)', async () => {
    store.saveAnswers(journeyId, {
      commodityLines: [line('0102 - Cattle'), line('010420 - Goats')]
    })
    await removeEntryAt(
      buildRequest(),
      stubH(),
      ['commodityLines'],
      Number('foo')
    )
    expect(
      answersNow().commodityLines.map((entry) => entry.commoditySelection)
    ).toEqual(['0102 - Cattle', '010420 - Goats'])
  })

  it('Should ignore an out-of-range index on remove', async () => {
    store.saveAnswers(journeyId, { commodityLines: [line('0102 - Cattle')] })
    await removeEntryAt(buildRequest(), stubH(), ['commodityLines'], 5)
    expect(answersNow().commodityLines).toEqual([line('0102 - Cattle')])
  })

  it('Should ignore a non-integer index on update', async () => {
    store.saveAnswers(journeyId, { commodityLines: [line('0102 - Cattle')] })
    await updateEntryAt(
      buildRequest(),
      stubH(),
      ['commodityLines'],
      Number('foo'),
      line('0301 - Fish')
    )
    expect(answersNow().commodityLines).toEqual([line('0102 - Cattle')])
  })

  it('Should ignore an out-of-range index on update', async () => {
    store.saveAnswers(journeyId, { commodityLines: [line('0102 - Cattle')] })
    await updateEntryAt(
      buildRequest(),
      stubH(),
      ['commodityLines'],
      5,
      line('0301 - Fish')
    )
    expect(answersNow().commodityLines).toEqual([line('0102 - Cattle')])
  })

  it('Should write through a commit that mutates a line, re-running reconcile and destroying the now-out-of-scope package count at its exact path', async () => {
    store.saveAnswers(journeyId, {
      commodityLines: [line('0102 - Cattle', { numberOfPackages: '5' })]
    })
    await commit(buildRequest(), stubH(), {
      commodityLines: [line('0301 - Fish', { numberOfPackages: '5' })]
    })
    const persisted = records.load({ journeyId }).answers
    expect(persisted.commodityLines[0].commoditySelection).toBe('0301 - Fish')
    expect('numberOfPackages' in persisted.commodityLines[0]).toBe(false)
  })

  it('Should preserve an in-scope package count when a commit leaves the line on the list', async () => {
    store.saveAnswers(journeyId, {
      commodityLines: [line('0102 - Cattle', { numberOfPackages: '5' })]
    })
    await commit(buildRequest(), stubH(), {
      commodityLines: [line('0102 - Cattle', { numberOfPackages: '9' })]
    })
    expect(records.load({ journeyId }).answers.commodityLines[0]).toEqual(
      line('0102 - Cattle', { numberOfPackages: '9' })
    )
  })
})

describe('path-addressed store ops at depth-2 (commodityLines[i].animalIdentifiers)', () => {
  beforeAll(() => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    buildDispatch(dispatchPages)
    configureReadyForCheckYourAnswers(readyForCheckYourAnswers)
  })
  beforeEach(() => {
    store.clear()
    journeyId = store.create().journeyId
  })

  const identifiersPath = (lineIndex) => [
    'commodityLines',
    lineIndex,
    'animalIdentifiers'
  ]
  const catsLine = (units = []) => ({
    commoditySelection: '01061900 - Cats',
    animalIdentifiers: units
  })
  const address = { name: 'Owner', address: { addressLine1: '1 Farm Lane' } }

  it('Should append a unit into a specific line, minting the nested index and persisting it', async () => {
    store.saveAnswers(journeyId, { commodityLines: [catsLine(), catsLine()] })
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
    expect(answersNow().commodityLines[0].animalIdentifiers).toEqual([])
    expect(
      answersNow().commodityLines[1].animalIdentifiers.map(
        (unit) => unit.animalIdentifierPassport
      )
    ).toEqual(['UK-1', 'UK-2'])
  })

  it('Should edit a unit in place at depth-2, leaving sibling units intact', async () => {
    store.saveAnswers(journeyId, {
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
      answersNow().commodityLines[0].animalIdentifiers.map(
        (unit) => unit.animalIdentifierPassport
      )
    ).toEqual(['UK-1-edited', 'UK-2'])
  })

  it('Should remove a unit in place at depth-2, leaving sibling units intact', async () => {
    store.saveAnswers(journeyId, {
      commodityLines: [
        catsLine([
          { animalIdentifierPassport: 'UK-1' },
          { animalIdentifierPassport: 'UK-2' }
        ])
      ]
    })
    await removeEntryAt(buildRequest(), stubH(), identifiersPath(0), 0)
    expect(
      answersNow().commodityLines[0].animalIdentifiers.map(
        (unit) => unit.animalIdentifierPassport
      )
    ).toEqual(['UK-2'])
  })

  it('Should ignore a non-integer nested index on remove (a malformed URL must not destroy unit 0)', async () => {
    store.saveAnswers(journeyId, {
      commodityLines: [catsLine([{ animalIdentifierPassport: 'UK-1' }])]
    })
    await removeEntryAt(
      buildRequest(),
      stubH(),
      identifiersPath(0),
      Number('foo')
    )
    expect(
      answersNow().commodityLines[0].animalIdentifiers.map(
        (unit) => unit.animalIdentifierPassport
      )
    ).toEqual(['UK-1'])
  })

  it('Should ignore an out-of-range nested index on update', async () => {
    store.saveAnswers(journeyId, {
      commodityLines: [catsLine([{ animalIdentifierPassport: 'UK-1' }])]
    })
    await updateEntryAt(buildRequest(), stubH(), identifiersPath(0), 5, {
      animalIdentifierPassport: 'UK-X'
    })
    expect(
      answersNow().commodityLines[0].animalIdentifiers[0]
        .animalIdentifierPassport
    ).toBe('UK-1')
  })

  it('Should destroy a nested permanentAddress at its exact depth-2 path when the enclosing commodity leaves the gate', async () => {
    store.saveAnswers(journeyId, {
      commodityLines: [
        catsLine([
          { animalIdentifierPassport: 'UK-1', permanentAddress: address }
        ])
      ]
    })
    await commit(buildRequest(), stubH(), {
      commodityLines: [
        {
          commoditySelection: '0101 - Horse',
          animalIdentifiers: [
            { animalIdentifierPassport: 'UK-1', permanentAddress: address }
          ]
        }
      ]
    })
    const persisted = records.load({ journeyId }).answers
    const unit = persisted.commodityLines[0].animalIdentifiers[0]
    expect(unit.animalIdentifierPassport).toBe('UK-1')
    expect('permanentAddress' in unit).toBe(false)
  })
})
