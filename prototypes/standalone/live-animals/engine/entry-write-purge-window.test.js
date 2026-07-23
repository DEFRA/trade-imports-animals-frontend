import { beforeEach, describe, expect, it } from 'vitest'
import { updateEntryAt } from './write.js'
import { makeScope, configureReadyForCheckYourAnswers } from './read.js'
import { records, configureRecords } from './persistence/records.js'
import { configureSession } from './persistence/session.js'
import { records as recordsStub } from '../services/persistence/records/stub.js'
import { session as sessionStub } from '../services/persistence/session/stub.js'
import { wipeSet } from '../bridge/purge.js'
import { migrateNameKeyedAnswersToFulfilments } from '../bridge/name-keyed-migration.js'
import { projectAnswers } from '../bridge/fulfilments.js'
import { stubH, journeyRequest } from './test-support.js'

// Every entry mutation now rebuilds and evaluates the canonical snapshot.
// These tests pin that the old stale-answer window has closed.

// horseName is gated on commodity 0101 (Horse); a Cow (0102) line holding a
// stored horseName is the simulated stale window.
const STALE_COW_LINE = {
  countryOfOrigin: 'FR',
  commodityLines: [
    {
      commoditySelection: 'Cow',
      speciesSelection: '1148346',
      numberOfAnimalsQuantity: '2',
      animalIdentifiers: [
        { animalIdentifierEarTag: 'UK123', horseName: 'Dobbin' }
      ]
    }
  ]
}

const HORSE_LINE = {
  countryOfOrigin: 'FR',
  commodityLines: [
    {
      commoditySelection: 'Horse',
      speciesSelection: '822332',
      numberOfAnimalsQuantity: '1',
      animalIdentifiers: [{ horseName: 'Dobbin' }]
    }
  ]
}

const STALE_HORSE_NAME_KEY = 'commodityLines[0].animalIdentifiers[0].horseName'

let journeyId
const buildRequest = () => journeyRequest(journeyId)
const seed = (answers) =>
  records.replaceFulfilment(
    journeyId,
    migrateNameKeyedAnswersToFulfilments(answers)
  )
const durable = async () =>
  projectAnswers((await records.load({ journeyId })).fulfilment)

describe('entry-write canonical purge', () => {
  beforeEach(async () => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    await records.clear()
    configureReadyForCheckYourAnswers(() => false)
    journeyId = (await records.create()).journeyId
  })

  it('Should keep an out-of-scope stored value invisible to scope', () => {
    const scope = makeScope(STALE_COW_LINE)
    expect(scope.inScope.has(STALE_HORSE_NAME_KEY)).toBe(false)
    expect(
      scope.inScope.has(
        'commodityLines[0].animalIdentifiers[0].animalIdentifierEarTag'
      )
    ).toBe(true)
  })

  it('Should name the stale value in the wipe set', () => {
    expect(wipeSet(STALE_COW_LINE)).toContain(STALE_HORSE_NAME_KEY)
  })

  it('Should destroy an out-of-scope value in the same updateEntryAt snapshot', async () => {
    await seed(HORSE_LINE)
    await updateEntryAt(
      buildRequest(),
      stubH(),
      ['commodityLines'],
      0,
      STALE_COW_LINE.commodityLines[0]
    )
    const answers = await durable()
    expect(
      answers.commodityLines[0].animalIdentifiers[0].horseName
    ).toBeUndefined()
    expect(
      answers.commodityLines[0].animalIdentifiers[0].animalIdentifierEarTag
    ).toBe('UK123')
  })
})
