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

import {
  configureRecords,
  DELETED
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
import { toRow } from '../dashboard/view-model/row/index.js'
import { routes } from './controller.js'
import { copy } from './copy/copy.en.js'

const SET_ID = 'plant-products'
const DASHBOARD_PATH = '/plant-products'
const get = routes.find(({ method }) => method === 'GET').handler
const post = routes.find(({ method }) => method === 'POST').handler
const inPlantProducts = (operation) => withSetContext(SET_ID, operation)

const createAtStatus = async (status) => {
  const journey = await inPlantProducts(() => recordsStub.create())
  if (status === 'submitted' || status === 'amend') {
    await inPlantProducts(() => recordsStub.finalise(journey.journeyId))
  }
  if (status === 'amend') {
    await inPlantProducts(() => recordsStub.amend(journey.journeyId))
  }
  return journey
}

describe('plant-products delete notification routes', () => {
  let server

  beforeAll(async () => {
    server = Hapi.server()
    await server.register(plantProducts, {
      routes: { prefix: DASHBOARD_PATH }
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

  it('registers prefix-free GET and POST delete routes', () => {
    expect(routes.map(({ method, path }) => ({ method, path }))).toEqual([
      { method: 'GET', path: pageRoutePath('delete') },
      { method: 'POST', path: pageRoutePath('delete') }
    ])
    expect(routes.map(({ path }) => path)).toEqual([
      '/notifications/{journeyId}/delete',
      '/notifications/{journeyId}/delete'
    ])
  })

  it.each(['draft', 'submitted', 'amend'])(
    'GET renders the journey-scoped confirmation for a %s notification',
    async (status) => {
      const journey = await createAtStatus(status)
      const h = stubH()

      await inPlantProducts(() => get(journeyRequest(journey.journeyId), h))
      const persisted = await inPlantProducts(() =>
        recordsStub.load({ journeyId: journey.journeyId })
      )
      const deleteAction = inPlantProducts(() =>
        toRow(persisted).actions.find(({ href }) => href?.endsWith('/delete'))
      )

      expect(h.captured.view.view).toBe(
        'plant-products/journeys/linear/features/delete-notification/template'
      )
      expect(h.captured.view.context).toMatchObject({
        heading: copy.title,
        deleteAction: expect.stringMatching(
          /^\/plant-products\/notifications\/[^/]+\/delete$/
        ),
        noHref: DASHBOARD_PATH,
        backLink: DASHBOARD_PATH,
        journeyStrip: { reference: journey.journeyId }
      })
      expect(deleteAction.href).toMatch(
        /^\/plant-products\/notifications\/[^/]+\/delete$/
      )
    }
  )

  it('GET from the read-only review returns there without changing the notification', async () => {
    const journey = await createAtStatus('submitted')
    const h = stubH()

    await inPlantProducts(() =>
      get(
        journeyRequest(journey.journeyId, {
          query: { source: 'notification-view' }
        }),
        h
      )
    )

    expect(h.captured.view.context.deleteAction).toMatch(
      /^\/plant-products\/notifications\/[^/]+\/delete\?source=notification-view$/
    )
    expect(h.captured.view.context.noHref).toBe(
      inPlantProducts(() => pagePath(journey.journeyId, 'review-notification'))
    )
    await expect(
      inPlantProducts(() => recordsStub.load({ journeyId: journey.journeyId }))
    ).resolves.toMatchObject({ status: 'submitted' })
  })

  it('POST soft-deletes the record, hides its reference from the list and remains idempotent', async () => {
    const journey = await createAtStatus('draft')

    const response = await inPlantProducts(() =>
      post(journeyRequest(journey.journeyId), stubH())
    )
    const loaded = await inPlantProducts(() =>
      recordsStub.load({ journeyId: journey.journeyId })
    )
    const listed = await inPlantProducts(() => recordsStub.list())

    expect(response.redirect).toMatch(/^\/plant-products\?deleted=1$/)
    expect(response).toEqual({
      redirect: `${inPlantProducts(() => dashboardPath())}?deleted=1`
    })
    expect(loaded).toMatchObject({
      journeyId: journey.journeyId,
      status: DELETED
    })
    expect(listed.rows.map(({ journeyId }) => journeyId)).not.toContain(
      journey.journeyId
    )
    await expect(
      inPlantProducts(() => recordsStub.softDelete(journey.journeyId))
    ).resolves.toMatchObject({ status: DELETED })
  })

  it('GET and POST guard an already-deleted notification', async () => {
    const journey = await createAtStatus('draft')
    await inPlantProducts(() => recordsStub.softDelete(journey.journeyId))

    const getResponse = await inPlantProducts(() =>
      get(journeyRequest(journey.journeyId), stubH())
    )
    const postResponse = await inPlantProducts(() =>
      post(journeyRequest(journey.journeyId), stubH())
    )

    expect(getResponse.redirect).toMatch(/^\/plant-products$/)
    expect(postResponse.redirect).toMatch(/^\/plant-products$/)
  })

  it('POST re-renders confirmation at 500 after a recoverable backend failure', async () => {
    const journey = await createAtStatus('draft')
    await inPlantProducts(() =>
      configureRecords(SET_ID, {
        ...recordsStub,
        softDelete: realRecords.softDelete
      })
    )
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('Unavailable', {
        status: 503,
        statusText: 'Service Unavailable'
      })
    )

    const response = await inPlantProducts(() =>
      post(journeyRequest(journey.journeyId), stubH())
    )

    expect(response.statusCode).toBe(500)
    expect(response.context.recoverableError).toBe(true)
    expect(response.view).toBe(
      'plant-products/journeys/linear/features/delete-notification/template'
    )
    await expect(
      inPlantProducts(() => recordsStub.load({ journeyId: journey.journeyId }))
    ).resolves.toMatchObject({ status: 'draft' })
  })
})
