import { SET_ID } from '../../../../set.js'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { buildDispatch } from '../../../../../../flow/dispatch.js'
import { store } from '../../../../../../engine/store.js'
import { configureRecords } from '../../../../../../engine/persistence/records.js'
import { configureSession } from '../../../../../../engine/persistence/session.js'
import { records as recordsStub } from '../../../../../../services/persistence/records/stub/index.js'
import { session as sessionStub } from '../../../../../../services/persistence/session/stub.js'
import {
  configureAnswersForRead,
  configureReadyForCheckYourAnswers
} from '../../../../../../engine/read.js'
import { journeyRequest, stubH } from '../../../../../../engine/test-support.js'
import { dispatchPages } from '../index.js'
import { withoutUnresolvedPartyRefs } from '../addresses/resolve-parties.js'
import { isReviewRefused } from './refusal.js'

const KNOWN_PORT = 'GB ABD'
const STALE_PORT = 'GB ZZZ'
const RESOLVING_ADDRESS_ID = 'astra-rosales'

const seedAnd = async (seed) => {
  const journey = await store.create()
  await store.seedAnswers(journey.journeyId, seed)
  return journey
}

const askRefused = async (journeyId) =>
  isReviewRefused(journeyRequest(journeyId), stubH())

describe('#isReviewRefused', () => {
  beforeAll(() => {
    configureRecords(SET_ID, recordsStub)
    configureSession(SET_ID, sessionStub)
    configureAnswersForRead(SET_ID, withoutUnresolvedPartyRefs)
    buildDispatch(SET_ID, dispatchPages)
  })
  beforeEach(() => {
    store.clear()
    configureReadyForCheckYourAnswers(SET_ID, () => true)
  })
  afterAll(() =>
    configureAnswersForRead(SET_ID, (_request, answers) => answers)
  )

  it('Should not refuse a submitted notification, even one carrying a stale answer', async () => {
    const journey = await seedAnd({ portOfEntry: STALE_PORT })
    await store.submit(journey.journeyId)

    expect(await askRefused(journey.journeyId)).toBe(false)
  })

  it('Should refuse an unfinished notification', async () => {
    configureReadyForCheckYourAnswers(SET_ID, () => false)
    const journey = await seedAnd({})

    expect(await askRefused(journey.journeyId)).toBe(true)
  })

  it('Should refuse a notification whose stored answer no longer passes its own rules', async () => {
    const journey = await seedAnd({ portOfEntry: STALE_PORT })

    expect(await askRefused(journey.journeyId)).toBe(true)
  })

  it('Should refuse a notification whose picked address has since been deleted', async () => {
    // Sanitiser drops the id from `answers`; storedAnswers keeps it. The
    // outstandingPartyErrors predicate reads exactly that difference.
    const journey = await seedAnd({ consignor: { addressId: 'gone' } })

    expect(await askRefused(journey.journeyId)).toBe(true)
  })

  it('Should not refuse a notification whose answers all pass', async () => {
    const journey = await seedAnd({
      portOfEntry: KNOWN_PORT,
      consignor: { addressId: RESOLVING_ADDRESS_ID }
    })

    expect(await askRefused(journey.journeyId)).toBe(false)
  })
})
