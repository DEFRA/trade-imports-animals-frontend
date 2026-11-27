import { SET_ID } from '../../../../set.js'
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest'

import { dashboardPath, pagePath } from '../../../../../../shared/paths.js'
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
import {
  actWithSessionOrganisation,
  expectOneLogged,
  journeyRequest,
  stubH
} from '../../../../../../engine/test-support.js'
import { records as recordsStub } from '../../../../../../services/persistence/records/stub/index.js'
import { records as realRecords } from '../../../../../../services/persistence/records/real/index.js'
import { session as sessionStub } from '../../../../../../services/persistence/session/stub.js'
import { dispatchPages } from '../index.js'
import * as cancelAmend from './controller.js'

const NOTIFICATION_VIEW_SLUG = 'notification-view'

const { CANCEL_AMEND_REFUSAL } = cancelAmend
const get = cancelAmend.routes.find((route) => route.method === 'GET').handler
const post = cancelAmend.routes.find((route) => route.method === 'POST').handler

const startAmend = async () => {
  const journey = await store.create()
  await records.replaceFulfilment(
    journey.journeyId,
    assembleFulfilments({
      internalReferenceNumber: 'SubmittedRef'
    })
  )
  await store.submit(journey.journeyId)
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

  it('Should render the question as heading and title, with the link back targeting the notification view', async () => {
    const journeyId = await startAmend()
    const h = stubH()

    const response = await get(journeyRequest(journeyId), h)

    expect(response.view).toBe(
      'live-animals/journeys/linear/features/cancel-amend/template'
    )
    expect(response.context).toMatchObject({
      pageTitle: 'Are you sure you want to cancel this amendment?',
      heading: 'Are you sure you want to cancel this amendment?',
      cancelAction: pagePath(journeyId, 'cancel-amend'),
      goBackHref: pagePath(journeyId, NOTIFICATION_VIEW_SLUG)
    })
  })

  it('Should carry no status strip and no back link on the confirmation page', async () => {
    const journeyId = await startAmend()

    const response = await get(journeyRequest(journeyId), stubH())

    expect(response.context.journeyStrip).toBeNull()
    expect(response.context.backLink).toBeUndefined()
  })

  it('Should cancel AMEND, restore the submitted content and redirect to the notification view at the address that marks the cancellation', async () => {
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

  it('Should send every non-amend state to the notification list without attempting the transition', async () => {
    const draft = await store.create()
    const submitted = await store.create()
    await records.submit(
      submitted.journeyId,
      undefined,
      submitted.concurrencyToken
    )

    expect(await get(journeyRequest(draft.journeyId), stubH())).toEqual({
      redirect: dashboardPath()
    })
    expect(await post(journeyRequest(submitted.journeyId), stubH())).toEqual({
      redirect: dashboardPath()
    })
    expect((await records.load({ journeyId: draft.journeyId })).status).toBe(
      'draft'
    )
    expect(
      (await records.load({ journeyId: submitted.journeyId })).status
    ).toBe(SUBMITTED)
  })

  it('Should log the refusal once with the journey id, its status and the reason', async () => {
    const submitted = await store.create()
    await records.submit(
      submitted.journeyId,
      undefined,
      submitted.concurrencyToken
    )
    const request = journeyRequest(submitted.journeyId)

    await get(request, stubH())

    expectOneLogged(request.logger, {
      level: 'info',
      fields: {
        journeyId: submitted.journeyId,
        status: SUBMITTED,
        refusal: CANCEL_AMEND_REFUSAL.notInAmend
      },
      message: 'Cancel amend refused'
    })
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

    const request = journeyRequest(journeyId)
    const response = await actWithSessionOrganisation(request, () =>
      post(request, h)
    )

    expect(response.statusCode).toBe(500)
    expect(response.context.recoverableError).toBe(true)
    expect(response.view).toBe(
      'live-animals/journeys/linear/features/cancel-amend/template'
    )
  })
})
