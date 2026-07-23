import { beforeEach, describe, expect, it } from 'vitest'
import { get } from './index.js'
import { records, configureRecords } from './persistence/records.js'
import { records as recordsStub } from '../services/persistence/records/stub.js'
import { session as sessionStub } from '../services/persistence/session/stub.js'
import { configureSession, STUB_USER } from './persistence/session.js'
import { configureReadyForCheckYourAnswers } from './read.js'
import { journeyRequest, recordingH } from './test-support.js'
import { assembleFulfilments } from '../bridge/assemble-fulfilments.js'

describe('re-entry self-heal (nothing derived is stored)', () => {
  beforeEach(async () => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    await records.clear()
    configureReadyForCheckYourAnswers(() => false)
  })

  it('Should re-derive scope on re-entry, excluding a now-out-of-scope obligation', async () => {
    const { journeyId } = await records.create({ userId: STUB_USER })
    await records.replaceFulfilment(
      journeyId,
      assembleFulfilments({
        countryOfOrigin: 'FR',
        reasonForImport: 'research',
        purposeInInternalMarket: 'breeding'
      })
    )

    const result = await get(journeyRequest(journeyId), recordingH())

    expect(result.scope.has('purposeInInternalMarket')).toBe(false)
    expect(result.scope.has('countryOfOrigin')).toBe(true)
  })

  it('Should expose only canonical durable fields — nothing derived is persisted', async () => {
    const { journeyId } = await records.create({ userId: STUB_USER })
    await records.replaceFulfilment(
      journeyId,
      assembleFulfilments({ countryOfOrigin: 'FR' })
    )

    const result = await get(journeyRequest(journeyId), recordingH())

    expect(Object.keys(result.journey).sort()).toEqual([
      'createdAt',
      'fulfilment',
      'journeyId',
      'status',
      'submittedAt',
      'userId'
    ])
    expect(result).toMatchObject({
      fulfilment: result.journey.fulfilment,
      evaluation: expect.any(Object),
      answers: { countryOfOrigin: 'FR' },
      scope: expect.any(Object)
    })
  })
})
