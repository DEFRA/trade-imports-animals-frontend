import Hapi from '@hapi/hapi'
import { load } from 'cheerio'
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

import { nunjucksConfig } from '../../../../../../../../config/nunjucks/nunjucks.js'
import { assembleFulfilments } from '../../../../../../bridge/assemble-fulfilments.js'
import { projectAnswers } from '../../../../../../bridge/fulfilments/index.js'
import { configureRecords } from '../../../../../../engine/persistence/records.js'
import { journeyRequest, stubH } from '../../../../../../engine/test-support.js'
import { knownJourneysCookie } from '../../../../../../engine/journey.js'
import { plantProducts } from '../../../../../../routes-plant-products.js'
import {
  dashboardPath,
  hubPath,
  pageRoutePath
} from '../../../../../../shared/paths.js'
import {
  enterSetContext,
  withSetContext
} from '../../../../../../shared/set-context.js'
import { records as realRecords } from '../../../../services/records/real.js'
import { records as recordsStub } from '../../../../services/records/stub.js'
import { routes } from './controller.js'

const copyPost = routes[0].handler
const inPlantProducts = (operation) =>
  withSetContext('plant-products', operation)

const createSubmitted = async (fulfilment = {}) => {
  const source = await recordsStub.create()
  await recordsStub.replaceFulfilment(source.journeyId, fulfilment)
  await recordsStub.finalise(source.journeyId)
  return source
}

describe('plant-products copy notification action', () => {
  let server

  beforeAll(async () => {
    server = Hapi.server()
    await server.register(nunjucksConfig)
    await server.register(plantProducts, {
      routes: { prefix: '/plant-products' }
    })
    await server.initialize()
  })

  beforeEach(async () => {
    enterSetContext('plant-products')
    configureRecords('plant-products', recordsStub)
    await recordsStub.clear()
  })

  afterEach(() => {
    enterSetContext('plant-products')
    configureRecords('plant-products', recordsStub)
    vi.restoreAllMocks()
  })

  afterAll(async () => server.stop({ timeout: 0 }))

  it('registers the prefix-free copy POST route', () => {
    expect(routes).toHaveLength(1)
    expect(routes[0]).toMatchObject({
      method: 'POST',
      path: pageRoutePath('copy')
    })
    expect(routes[0].path).toBe('/notifications/{journeyId}/copy')
  })

  it('copies a submitted notification to a documentless draft and redirects to its plant hub', async () => {
    const source = await createSubmitted(
      inPlantProducts(() =>
        assembleFulfilments({
          countryOfOrigin: 'FR',
          accompanyingDocuments: [
            {
              documentType: 'PHYTOSANITARY_CERTIFICATE',
              documentReference: 'PHYTO-COPY-045',
              issueDate: { day: '4', month: '8', year: '2026' }
            }
          ]
        })
      )
    )
    const h = stubH()

    const response = await inPlantProducts(() =>
      copyPost(
        journeyRequest(source.journeyId, {
          payload: {
            idempotencyKey: '  copy-key-045  ',
            copyOrigin: 'notification-view'
          }
        }),
        h
      )
    )

    expect(response.redirect).toMatch(
      /^\/plant-products\/notifications\/GBN-PP-[^/]+$/
    )
    const copiedJourneyId = response.redirect.split('/').at(-1)
    expect(response.redirect).toBe(
      inPlantProducts(() => hubPath(copiedJourneyId))
    )
    expect(copiedJourneyId).not.toBe(source.journeyId)
    const copied = await recordsStub.load({ journeyId: copiedJourneyId })
    expect(copied.status).toBe('draft')
    expect(inPlantProducts(() => projectAnswers(copied.fulfilment))).toEqual({
      countryOfOrigin: 'FR'
    })
  })

  it.each([
    ['missing', undefined, undefined],
    ['blank', '   ', '']
  ])(
    'passes a %s idempotency key through without replacing it',
    async (_label, supplied, expected) => {
      const source = await createSubmitted()
      const copy = vi.fn(async () => ({
        journeyId: 'GBN-PP-26-COPIED',
        status: 'draft',
        fulfilment: {}
      }))
      configureRecords('plant-products', { ...recordsStub, copy })

      await inPlantProducts(() =>
        copyPost(
          journeyRequest(source.journeyId, {
            payload: {
              idempotencyKey: supplied,
              copyOrigin: 'dashboard'
            }
          }),
          stubH()
        )
      )

      expect(copy).toHaveBeenCalledWith(source.journeyId, expected)
    }
  )

  it('re-renders the review page at 500 with its original key', async () => {
    const source = await createSubmitted()
    configureRecords('plant-products', {
      ...recordsStub,
      copy: realRecords.copy
    })
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('Unavailable', {
        status: 503,
        statusText: 'Service Unavailable'
      })
    )

    const response = await inPlantProducts(() =>
      copyPost(
        journeyRequest(source.journeyId, {
          payload: {
            idempotencyKey: 'review-retry-key',
            copyOrigin: 'notification-view'
          }
        }),
        stubH()
      )
    )

    expect(response.statusCode).toBe(500)
    expect(response.view).toBe(
      'plant-products/journeys/linear/features/check-answers/template'
    )
    expect(response.context.recoverableError).toBe(true)
    expect(response.context.copyAction.idempotencyKey).toBe('review-retry-key')
  })

  it('re-renders the originating dashboard row at 500 with its original key', async () => {
    const source = await createSubmitted()
    configureRecords('plant-products', {
      ...recordsStub,
      copy: realRecords.copy
    })
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('Unavailable', {
        status: 503,
        statusText: 'Service Unavailable'
      })
    )

    const response = await inPlantProducts(() =>
      copyPost(
        journeyRequest(source.journeyId, {
          payload: {
            idempotencyKey: 'dashboard-retry-key',
            copyOrigin: 'dashboard'
          }
        }),
        stubH()
      )
    )

    const sourceRow = response.context.notificationRows.find(
      ({ reference }) => reference === source.journeyId
    )
    const copyAction = sourceRow.actions.find(
      ({ text }) => text === 'Copy as new'
    )
    expect(response.statusCode).toBe(500)
    expect(response.view).toBe(
      'plant-products/journeys/linear/features/dashboard/template'
    )
    expect(response.context.recoverableError).toBe(true)
    expect(copyAction.idempotencyKey).toBe('dashboard-retry-key')
  })

  it('re-renders a filtered dashboard source row with its original key', async () => {
    const source = await createSubmitted()
    const other = await createSubmitted()
    const sourceJourney = await recordsStub.load({
      journeyId: source.journeyId
    })
    const otherJourney = await recordsStub.load({ journeyId: other.journeyId })
    configureRecords('plant-products', {
      ...recordsStub,
      list: async ({ referenceNumber }) => ({
        rows: [
          referenceNumber === source.journeyId ? sourceJourney : otherJourney
        ],
        page: 1,
        size: 25,
        totalElements: 1,
        totalPages: 1
      }),
      copy: realRecords.copy
    })
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('Unavailable', {
        status: 503,
        statusText: 'Service Unavailable'
      })
    )

    const filteredDashboard = await server.inject(
      `/plant-products?referenceNumber=${source.journeyId}`
    )
    const $ = load(filteredDashboard.result)
    const sourceRow = $('main tbody tr').filter((_index, row) =>
      $(row).text().includes(source.journeyId)
    )
    const copyForm = sourceRow.find('form[method="post"]')
    const action = copyForm.attr('action')
    const originalKey = copyForm
      .find('input[name="idempotencyKey"]')
      .attr('value')
    const actionUrl = new URL(action, 'http://localhost')

    const response = await inPlantProducts(() =>
      copyPost(
        journeyRequest(source.journeyId, {
          query: Object.fromEntries(actionUrl.searchParams),
          payload: {
            idempotencyKey: originalKey,
            copyOrigin: 'dashboard'
          }
        }),
        stubH()
      )
    )

    const recoveredSourceRow = response.context.notificationRows.find(
      ({ reference }) => reference === source.journeyId
    )
    const recoveredCopyAction = recoveredSourceRow?.actions.find(
      ({ text }) => text === 'Copy as new'
    )
    expect(response.statusCode).toBe(500)
    expect(recoveredSourceRow).toBeDefined()
    expect(recoveredCopyAction.idempotencyKey).toBe(originalKey)
  })

  it('redirects an org-visible but session-unknown source to the plant dashboard without copying', async () => {
    const copy = vi.fn()
    configureRecords('plant-products', { ...recordsStub, copy })

    const response = await inPlantProducts(() =>
      copyPost(
        journeyRequest('GBN-PP-26-ORGROW', {
          payload: {
            idempotencyKey: 'unused-key',
            copyOrigin: 'dashboard'
          },
          state: { [knownJourneysCookie()]: [] }
        }),
        stubH()
      )
    )

    expect(response.redirect).toBe(inPlantProducts(() => dashboardPath()))
    expect(response.redirect).toMatch(/^\/plant-products$/)
    expect(copy).not.toHaveBeenCalled()
  })
})
