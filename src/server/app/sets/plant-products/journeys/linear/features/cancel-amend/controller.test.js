import Hapi from '@hapi/hapi'
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest'

import { assembleFulfilments } from '../../../../../../bridge/assemble-fulfilments.js'
import { projectAnswers } from '../../../../../../bridge/fulfilments/index.js'
import {
  configureRecords,
  SUBMITTED
} from '../../../../../../engine/persistence/records.js'
import { journeyRequest, stubH } from '../../../../../../engine/test-support.js'
import { plantProducts } from '../../../../../../routes-plant-products.js'
import {
  dashboardPath,
  pagePath,
  pageRoutePath
} from '../../../../../../shared/paths.js'
import { withSetContext } from '../../../../../../shared/set-context.js'
import { records as realRecords } from '../../../../services/records/real.js'
import { records as recordsStub } from '../../../../services/records/stub.js'
import { routes } from './controller.js'
import { copy } from './copy/copy.en.js'

const SET_ID = 'plant-products'
const get = routes.find(({ method }) => method === 'GET').handler
const post = routes.find(({ method }) => method === 'POST').handler
const inPlantProducts = (operation) => withSetContext(SET_ID, operation)

const createAtStatus = async (status) =>
  inPlantProducts(async () => {
    const journey = await recordsStub.create()
    if (status === 'submitted' || status === 'amend') {
      await recordsStub.finalise(journey.journeyId)
    }
    if (status === 'amend') {
      await recordsStub.amend(journey.journeyId)
    }
    return journey
  })

const startEditedAmendment = async () =>
  inPlantProducts(async () => {
    const journey = await recordsStub.create()
    await recordsStub.replaceFulfilment(
      journey.journeyId,
      assembleFulfilments({ internalReference: 'SUBMITTED-BASELINE' })
    )
    await recordsStub.finalise(journey.journeyId)
    await recordsStub.amend(journey.journeyId)
    await recordsStub.replaceFulfilment(
      journey.journeyId,
      assembleFulfilments({ internalReference: 'DISCARD-THIS-EDIT' })
    )
    return journey.journeyId
  })

describe('plant-products cancel amendment routes', () => {
  let server

  beforeAll(async () => {
    server = Hapi.server()
    await server.register(plantProducts, {
      routes: { prefix: '/plant-products' }
    })
  })

  beforeEach(async () => {
    await inPlantProducts(async () => {
      configureRecords(SET_ID, recordsStub)
      await recordsStub.clear()
    })
  })

  afterEach(async () => {
    await inPlantProducts(async () => {
      configureRecords(SET_ID, recordsStub)
      await recordsStub.clear()
    })
    vi.restoreAllMocks()
  })

  afterAll(async () => server.stop({ timeout: 0 }))

  it('registers prefix-free GET and POST cancel-amend routes', () => {
    expect(routes.map(({ method, path }) => ({ method, path }))).toEqual([
      { method: 'GET', path: pageRoutePath('cancel-amend') },
      { method: 'POST', path: pageRoutePath('cancel-amend') }
    ])
    expect(routes.map(({ path }) => path)).toEqual([
      '/notifications/{journeyId}/cancel-amend',
      '/notifications/{journeyId}/cancel-amend'
    ])
  })

  it('GET renders confirmation only for an AMEND notification', async () => {
    const journey = await createAtStatus('amend')
    const h = stubH()

    await inPlantProducts(() => get(journeyRequest(journey.journeyId), h))

    expect(h.captured.view.view).toBe(
      'plant-products/journeys/linear/features/cancel-amend/template'
    )
    expect(h.captured.view.context).toMatchObject({
      heading: copy.title,
      cancelAction: expect.stringMatching(
        /^\/plant-products\/notifications\/[^/]+\/cancel-amend$/
      ),
      noHref: expect.stringMatching(
        /^\/plant-products\/notifications\/[^/]+\/review-notification$/
      ),
      backLink: expect.stringMatching(
        /^\/plant-products\/notifications\/[^/]+\/review-notification$/
      ),
      journeyStrip: { reference: journey.journeyId }
    })
  })

  it('GET redirects SUBMITTED to plant review and DRAFT to the plant dashboard', async () => {
    const submitted = await createAtStatus('submitted')
    const draft = await createAtStatus('draft')

    const submittedResponse = await inPlantProducts(() =>
      get(journeyRequest(submitted.journeyId), stubH())
    )
    const draftResponse = await inPlantProducts(() =>
      get(journeyRequest(draft.journeyId), stubH())
    )

    expect(submittedResponse.redirect).toMatch(
      /^\/plant-products\/notifications\/[^/]+\/review-notification$/
    )
    expect(submittedResponse).toEqual({
      redirect: inPlantProducts(() =>
        pagePath(submitted.journeyId, 'review-notification')
      )
    })
    expect(draftResponse).toEqual({
      redirect: inPlantProducts(() => dashboardPath())
    })
  })

  it('POST cancellation restores the submitted answer, discarding the amendment edit', async () => {
    const journeyId = await startEditedAmendment()

    const response = await inPlantProducts(() =>
      post(journeyRequest(journeyId), stubH())
    )
    const restored = await inPlantProducts(() =>
      recordsStub.load({ journeyId })
    )

    expect(response.redirect).toMatch(
      /^\/plant-products\/notifications\/[^/]+\/review-notification\?cancelled=1$/
    )
    expect(restored.status).toBe(SUBMITTED)
    const restoredAnswers = inPlantProducts(() =>
      projectAnswers(restored.fulfilment)
    )
    expect(restoredAnswers.internalReference).toBe('SUBMITTED-BASELINE')
    expect(restoredAnswers.internalReference).not.toBe('DISCARD-THIS-EDIT')
  })

  it('POST re-checks status and does not cancel a SUBMITTED notification', async () => {
    const journey = await createAtStatus('submitted')

    const response = await inPlantProducts(() =>
      post(journeyRequest(journey.journeyId), stubH())
    )

    expect(response.redirect).toMatch(
      /^\/plant-products\/notifications\/[^/]+\/review-notification$/
    )
    await expect(
      inPlantProducts(() => recordsStub.load({ journeyId: journey.journeyId }))
    ).resolves.toMatchObject({ status: SUBMITTED })
  })

  it('POST re-renders confirmation at 500 after a recoverable backend failure', async () => {
    const journeyId = await startEditedAmendment()
    await inPlantProducts(() =>
      configureRecords(SET_ID, {
        ...recordsStub,
        cancelAmend: realRecords.cancelAmend
      })
    )
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('Unavailable', {
        status: 503,
        statusText: 'Service Unavailable'
      })
    )

    const response = await inPlantProducts(() =>
      post(journeyRequest(journeyId), stubH())
    )

    expect(response.statusCode).toBe(500)
    expect(response.context.recoverableError).toBe(true)
    expect(response.view).toBe(
      'plant-products/journeys/linear/features/cancel-amend/template'
    )
  })
})
