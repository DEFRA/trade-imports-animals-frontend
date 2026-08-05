import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest'

import { pagePath } from '../../../../../../shared/paths.js'
import { assembleFulfilments } from '../../../../../../bridge/assemble-fulfilments.js'
import { projectAnswers } from '../../../../../../bridge/fulfilments/index.js'
import { buildDispatch } from '../../../../../../flow/dispatch.js'
import {
  configureRecords,
  records,
  SUBMITTED
} from '../../../../../../engine/persistence/records.js'
import {
  configureSession,
  knownJourneysCookie
} from '../../../../../../engine/persistence/session.js'
import { store } from '../../../../../../engine/store.js'
import { journeyRequest, stubH } from '../../../../../../engine/test-support.js'
import { records as recordsStub } from '../../../../../../services/persistence/records/stub/index.js'
import { records as realRecords } from '../../../../../../services/persistence/records/real/index.js'
import { session as sessionStub } from '../../../../../../services/persistence/session/stub.js'
import { dispatchPages } from '../index.js'
import * as cancelAmend from './controller.js'

const SET_ID = 'live-animals'

const NOTIFICATION_VIEW_SLUG = 'notification-view'

const get = cancelAmend.routes.find((route) => route.method === 'GET').handler
const post = cancelAmend.routes.find((route) => route.method === 'POST').handler

const startAmend = async () => {
  const journey = await store.create()
  await records.replaceFulfilment(
    journey.journeyId,
    assembleFulfilments({ internalReferenceNumber: 'SubmittedRef' })
  )
  await records.finalise(journey.journeyId)
  await records.amend(journey.journeyId)
  await records.replaceFulfilment(
    journey.journeyId,
    assembleFulfilments({ internalReferenceNumber: 'AmendedRef' })
  )
  return journey.journeyId
}

describe('cancel amendment routes', () => {
  beforeAll(() => {
    configureSession(SET_ID, sessionStub)
    buildDispatch(SET_ID, dispatchPages)
  })

  beforeEach(() => {
    configureRecords(SET_ID, recordsStub)
    store.clear()
  })

  afterEach(() => {
    configureRecords(SET_ID, recordsStub)
    vi.unstubAllGlobals()
  })

  it('Should render the confirmation for an amending journey with journey-scoped actions', async () => {
    const journeyId = await startAmend()
    const h = stubH()

    const response = await get(journeyRequest(journeyId), h)

    expect(response.view).toBe(
      'live-animals/journeys/linear/features/cancel-amend/template'
    )
    expect(response.context).toMatchObject({
      heading: 'Cancel this amendment?',
      cancelAction: pagePath(journeyId, 'cancel-amend'),
      noHref: pagePath(journeyId, NOTIFICATION_VIEW_SLUG)
    })
    expect(response.context.copy.body).toContain('submitted version restored')
  })

  it('Should cancel AMEND, restore submitted content and redirect to the read-only CYA with success', async () => {
    const journeyId = await startAmend()

    const response = await post(journeyRequest(journeyId), stubH())

    expect(response).toEqual({
      redirect: `${pagePath(journeyId, NOTIFICATION_VIEW_SLUG)}?cancelled=1`
    })
    const restored = await records.load({ journeyId })
    expect(restored.status).toBe(SUBMITTED)
    expect(projectAnswers(restored.fulfilment).internalReferenceNumber).toBe(
      'SubmittedRef'
    )
  })

  it('Should redirect non-AMEND journeys without attempting the transition', async () => {
    const draft = await store.create()
    const submitted = await store.create()
    await records.finalise(submitted.journeyId)

    expect(await get(journeyRequest(draft.journeyId), stubH())).toEqual({
      redirect: '/live-animals'
    })
    expect(await post(journeyRequest(submitted.journeyId), stubH())).toEqual({
      redirect: pagePath(submitted.journeyId, NOTIFICATION_VIEW_SLUG)
    })
    expect((await records.load({ journeyId: draft.journeyId })).status).toBe(
      'draft'
    )
    expect(
      (await records.load({ journeyId: submitted.journeyId })).status
    ).toBe(SUBMITTED)
  })

  it('Should reject an unknown journey at the known-journey gate', async () => {
    await expect(
      post(
        journeyRequest('GBN-AG-26-UNKNOWN', {
          state: { [knownJourneysCookie()]: [] }
        }),
        stubH()
      )
    ).rejects.toMatchObject({
      isBoom: true,
      output: { statusCode: 404 }
    })
  })

  it('Should re-render confirmation at 500 with the recoverable-save banner after a backend failure', async () => {
    configureRecords(SET_ID, {
      ...recordsStub,
      cancelAmend: realRecords.cancelAmend
    })
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable'
      }))
    )
    const journeyId = await startAmend()
    const h = stubH()

    const response = await post(journeyRequest(journeyId), h)

    expect(response.statusCode).toBe(500)
    expect(response.context.recoverableError).toBe(true)
    expect(response.view).toBe(
      'live-animals/journeys/linear/features/cancel-amend/template'
    )
  })
})
