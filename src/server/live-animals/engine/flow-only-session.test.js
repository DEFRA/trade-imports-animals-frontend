import { beforeEach, describe, expect, it, vi } from 'vitest'
import { commit } from './write.js'
import { get, configureReadyForCheckYourAnswers } from './read.js'
import { records, configureRecords } from './persistence/records.js'
import {
  configureSession,
  FLOW_ONLY_ANSWERS_COOKIE
} from './persistence/session.js'
import { records as recordsStub } from '../services/persistence/records/stub.js'
import { session as sessionStub } from '../services/persistence/session/stub.js'
import { journeyRequest, recordingH } from './test-support.js'

describe('flow-only answers — session round-trip', () => {
  beforeEach(async () => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    configureReadyForCheckYourAnswers(() => false)
    await records.clear()
  })

  it('Should return importType and declaration from a fresh read after commit without adding them to fulfilment', async () => {
    const journey = await records.create()
    const writeH = recordingH()

    await commit(journeyRequest(journey.journeyId), writeH, {
      importType: 'live-animals',
      declaration: 'confirmed'
    })

    expect(
      (await records.load({ journeyId: journey.journeyId })).fulfilment
    ).toEqual({})

    const freshRequest = journeyRequest(journey.journeyId, {
      state: {
        [FLOW_ONLY_ANSWERS_COOKIE]: writeH.cookies[FLOW_ONLY_ANSWERS_COOKIE]
      }
    })
    const fresh = await get(freshRequest, recordingH())

    expect(fresh.answers.importType).toBe('live-animals')
    expect(fresh.answers.declaration).toBe('confirmed')
  })

  it('Should load flow-only session state once when a request reads repeatedly', async () => {
    const journey = await records.create()
    const flowOnlyAnswers = vi.fn(sessionStub.flowOnlyAnswers)
    configureSession({ ...sessionStub, flowOnlyAnswers })
    const request = journeyRequest(journey.journeyId, {
      app: {},
      state: {
        [FLOW_ONLY_ANSWERS_COOKIE]: {
          [journey.journeyId]: { importType: 'live-animals' }
        }
      }
    })

    await get(request, recordingH())
    await get(request, recordingH())

    expect(flowOnlyAnswers).toHaveBeenCalledOnce()
  })
})
