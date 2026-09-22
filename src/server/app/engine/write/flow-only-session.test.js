import { SET_ID } from '../../sets/live-animals/set.js'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { commit } from './index.js'
import { get, configureReadyForCheckYourAnswers } from '../read.js'
import { records, configureRecords } from '../persistence/records.js'
import {
  configureSession,
  flowOnlyAnswersCookie
} from '../persistence/session.js'
import { records as recordsStub } from '../../services/persistence/records/stub/index.js'
import { session as sessionStub } from '../../services/persistence/session/stub.js'
import { journeyRequest, recordingH } from '../test-support.js'

const DECLARATION_CONFIRMED = 'confirmed'

describe('flow-only answers — session round-trip', () => {
  beforeEach(async () => {
    configureRecords(SET_ID, recordsStub)
    configureSession(SET_ID, sessionStub)
    configureReadyForCheckYourAnswers(SET_ID, () => false)
    await records.clear()
  })

  it('Should return declaration from a fresh read after commit without adding it to fulfilment', async () => {
    const journey = await records.create()
    const writeH = recordingH()

    await commit(journeyRequest(journey.journeyId), writeH, {
      declaration: DECLARATION_CONFIRMED
    })

    expect(
      (await records.load({ journeyId: journey.journeyId })).fulfilment
    ).toEqual({})

    const freshRequest = journeyRequest(journey.journeyId, {
      state: {
        [flowOnlyAnswersCookie()]: writeH.cookies[flowOnlyAnswersCookie()]
      }
    })
    const fresh = await get(freshRequest, recordingH())

    expect(fresh.answers.declaration).toBe(DECLARATION_CONFIRMED)
  })

  it('Should load flow-only session state once when a request reads repeatedly', async () => {
    const journey = await records.create()
    const flowOnlyAnswers = vi.fn(sessionStub.flowOnlyAnswers)
    configureSession(SET_ID, { ...sessionStub, flowOnlyAnswers })
    const request = journeyRequest(journey.journeyId, {
      app: {},
      state: {
        [flowOnlyAnswersCookie()]: {
          [journey.journeyId]: { declaration: DECLARATION_CONFIRMED }
        }
      }
    })

    await get(request, recordingH())
    await get(request, recordingH())

    expect(flowOnlyAnswers).toHaveBeenCalledOnce()
  })
})
