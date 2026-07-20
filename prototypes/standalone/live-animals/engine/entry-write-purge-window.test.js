import { beforeEach, describe, expect, it } from 'vitest'
import { commit, updateEntryAt } from './write.js'
import { makeScope, configureReadyForCheckYourAnswers } from './read.js'
import { records, configureRecords } from './persistence/records.js'
import { configureSession } from './persistence/session.js'
import { records as recordsStub } from '../services/persistence/records/stub.js'
import { session as sessionStub } from '../services/persistence/session/stub.js'
import { wipeSet } from '../bridge/purge.js'
import { stubH, journeyRequest } from './test-support.js'

// Entry-level writes (appendEntryAt/updateEntryAt) save WITHOUT purging —
// commit/removeEntryAt/reconcileEntriesAt are the purge authorities. That
// window is benign under the current controllers because no entry-write
// caller mutates a gate input (consignment-details rewrites counts only;
// animal-identification/documents append records whose gate input rides in
// the same new record). These tests pin the engine properties that keep a
// hypothetically stale store harmless: scope never surfaces an out-of-scope
// stored value, the wipe set names it, and the next commit destroys it
// durably.

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
const seed = (answers) => records.saveAnswers(journeyId, answers)
const durable = async () => (await records.load({ journeyId })).answers

describe('entry-write purge window', () => {
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

  it('Should retain the stale value on updateEntryAt and destroy it at the next commit', async () => {
    await seed(HORSE_LINE)
    // A hypothetical gate-flipping entry write: Horse -> Cow with the
    // horse-gated identifier still aboard. updateEntryAt saves as-is — the
    // deliberate commit-purge-authority design.
    await updateEntryAt(
      buildRequest(),
      stubH(),
      ['commodityLines'],
      0,
      STALE_COW_LINE.commodityLines[0]
    )
    const stale = await durable()
    expect(stale.commodityLines[0].animalIdentifiers[0].horseName).toBe(
      'Dobbin'
    )

    // The window closes at the next purging write, whatever its patch.
    const { answers } = await commit(buildRequest(), stubH(), {})
    expect(
      answers.commodityLines[0].animalIdentifiers[0].horseName
    ).toBeUndefined()
    const after = await durable()
    expect(
      after.commodityLines[0].animalIdentifiers[0].horseName
    ).toBeUndefined()
    expect(
      after.commodityLines[0].animalIdentifiers[0].animalIdentifierEarTag
    ).toBe('UK123')
  })
})
