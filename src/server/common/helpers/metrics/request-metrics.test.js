import { once } from 'node:events'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { get } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { setTimeout } from 'node:timers/promises'
import hapi from '@hapi/hapi'
import vision from '@hapi/vision'
import { vi } from 'vitest'

import { requestMetrics, routePage, routeArea } from './request-metrics.js'
import {
  BACKEND_DEPENDENCY,
  callCounts,
  countExternalCall,
  countSessionResolution
} from '../call-counts/call-counts.js'
import { config } from '../../../../config/config.js'
import { recordEmfDocuments } from '../../test-helpers/emf-documents.js'
import { restoreConfigAfterEach } from '../../test-helpers/restore-config-after-each.js'

const PAGE_REQUEST_METRICS_ENABLED_KEY = 'callCounts.metrics.enabled'
const REQUEST_TIMER = 'http.server.requests'
const VALIDATION_FAILURE = 'journey.validation.failure'
const PAGE_REQUEST_BACKEND_CALLS = 'page.request.backend.calls'
const ORIGIN_URL = '/live-animals/notifications/j-1/origin'
const CONTACT_ROUTE_PATH =
  '/live-animals/notifications/{journeyId}/consignment/contact/edit'
const CONTACT_URL = '/live-animals/notifications/j-1/consignment/contact/edit'
const CONTACT_TEMPLATE = 'contact.html'

const routePages = (server) =>
  server.route([
    {
      method: 'GET',
      path: '/live-animals/notifications/{journeyId}/origin',
      handler: async (request) => {
        const handlerDelayMs = 20
        await setTimeout(handlerDelayMs)
        countExternalCall({
          dependency: BACKEND_DEPENDENCY,
          operation: 'get-fulfilment'
        })
        countExternalCall({
          dependency: BACKEND_DEPENDENCY,
          operation: 'replace-notification'
        })
        countExternalCall({ dependency: 'defra-id', operation: 'jwks' })
        countSessionResolution(request)
        return 'origin'
      }
    },
    {
      method: 'POST',
      path: CONTACT_ROUTE_PATH,
      handler: (request, h) =>
        h.view(CONTACT_TEMPLATE, {
          errorSummary: request.payload.refused ? { errorList: [] } : null
        })
    },
    {
      method: 'GET',
      path: CONTACT_ROUTE_PATH,
      handler: (_request, h) =>
        h.view(CONTACT_TEMPLATE, { errorSummary: { errorList: [] } })
    },
    { method: 'GET', path: '/health', handler: () => 'ok' }
  ])

describe('route area and page', () => {
  test.each([
    ['/live-animals/notifications/{journeyId}/origin', 'origin', 'origin'],
    [CONTACT_ROUTE_PATH, 'consignment', 'consignment/contact/edit'],
    [
      '/live-animals/notifications/{journeyId}/accompanying-documents/{uploadId}/file',
      'accompanying-documents',
      'accompanying-documents/file'
    ],
    [
      '/live-animals/notifications/{journeyId}',
      'notifications',
      'notifications'
    ],
    ['/live-animals/notifications', 'notifications', 'notifications'],
    ['/live-animals', 'live-animals', 'live-animals'],
    ['/auth/sign-in', 'sign-in', 'sign-in'],
    [
      '/stub-upload-and-scan/{uploadId}',
      'stub-upload-and-scan',
      'stub-upload-and-scan'
    ],
    ['/', 'root', 'root'],
    ['/{p*}', 'unmatched', 'unmatched']
  ])('%s is in area %s and shows page %s', (routePath, area, page) => {
    expect(routeArea(routePath)).toBe(area)
    expect(routePage(routePath)).toBe(page)
  })
})

describe('request metrics', () => {
  const emf = recordEmfDocuments()
  restoreConfigAfterEach([PAGE_REQUEST_METRICS_ENABLED_KEY])
  let templateDirectory
  let server

  beforeAll(async () => {
    templateDirectory = await mkdtemp(join(tmpdir(), 'request-metrics-'))
    await writeFile(join(templateDirectory, CONTACT_TEMPLATE), 'page')
  })

  afterAll(async () => {
    await rm(templateDirectory, { recursive: true })
  })

  beforeEach(async () => {
    server = hapi.server()
    await server.register([callCounts, requestMetrics, vision])
    server.views({
      engines: { html: { compile: () => () => 'page' } },
      path: templateDirectory
    })
    routePages(server)
  })

  afterEach(async () => {
    await server.stop({ timeout: 0 })
  })

  const requestTimesPublished = (count) =>
    vi.waitFor(() =>
      expect(emf.documentsWith(REQUEST_TIMER)).toHaveLength(count)
    )

  test('a page request publishes its time from received to completed tagged method, area and status class', async () => {
    const { request } = await server.inject({ method: 'GET', url: ORIGIN_URL })
    const elapsedMs = request.info.completed - request.info.received

    await requestTimesPublished(1)
    expect(emf.publishesOf(REQUEST_TIMER)).toEqual([
      {
        value: elapsedMs,
        unit: 'Milliseconds',
        dimensions: { method: 'GET', area: 'origin', 'status.class': '2xx' }
      }
    ])
    expect(elapsedMs).toBeGreaterThan(0)
  })

  test('a request no route matches is published in area unmatched with status class 4xx', async () => {
    await server.inject({ method: 'GET', url: '/nowhere' })

    await requestTimesPublished(1)
    const [document] = emf.documentsWith(REQUEST_TIMER)
    expect(document.area).toBe('unmatched')
    expect(document['status.class']).toBe('4xx')
  })

  test('a request the client aborts is published with status class 4xx', async () => {
    let handlerStarted
    const handlerReached = new Promise((resolve) => {
      handlerStarted = resolve
    })
    server.route({
      method: 'GET',
      path: '/live-animals/notifications/{journeyId}/slow',
      handler: async (request) => {
        handlerStarted()
        await new Promise((resolve) =>
          request.events.once('disconnect', resolve)
        )
        return 'too late'
      }
    })
    await server.start()

    const clientRequest = get(
      `${server.info.uri}/live-animals/notifications/j-1/slow`
    )
    const clientHangUp = once(clientRequest, 'error')
    await handlerReached
    clientRequest.destroy()
    await clientHangUp

    await requestTimesPublished(1)
    expect(emf.documentsWith(REQUEST_TIMER)[0]['status.class']).toBe('4xx')
  })

  test('a health check is not published', async () => {
    await server.inject({ method: 'GET', url: '/health' })
    await server.inject({ method: 'GET', url: ORIGIN_URL })

    await requestTimesPublished(1)
    expect(emf.documentsWith(REQUEST_TIMER)[0].area).toBe('origin')
  })

  test('a posted answer shown again with an error summary counts one validation failure for its page', async () => {
    await server.inject({
      method: 'POST',
      url: CONTACT_URL,
      payload: { refused: 'yes' }
    })

    await vi.waitFor(() =>
      expect(emf.publishesOf(VALIDATION_FAILURE)).toEqual([
        {
          value: 1,
          unit: 'Count',
          dimensions: { page: 'consignment/contact/edit' }
        }
      ])
    )
  })

  test('a posted answer shown with no error summary counts no validation failure', async () => {
    await server.inject({
      method: 'POST',
      url: CONTACT_URL,
      payload: {}
    })

    await requestTimesPublished(1)
    expect(emf.documentsWith(VALIDATION_FAILURE)).toEqual([])
  })

  test('a page viewed with an error summary counts no validation failure', async () => {
    await server.inject({
      method: 'GET',
      url: CONTACT_URL
    })

    await requestTimesPublished(1)
    expect(emf.documentsWith(VALIDATION_FAILURE)).toEqual([])
  })

  test('publishes the page request counts tagged request.kind page when callCounts.metrics.enabled is on', async () => {
    config.set(PAGE_REQUEST_METRICS_ENABLED_KEY, true)
    await server.inject({ method: 'GET', url: ORIGIN_URL })

    await vi.waitFor(() =>
      expect(emf.documentsWith(PAGE_REQUEST_BACKEND_CALLS)).toHaveLength(1)
    )
    const pageRequestKind = { 'request.kind': 'page' }
    expect(emf.publishesOf(PAGE_REQUEST_BACKEND_CALLS)).toEqual([
      { value: 2, unit: 'Count', dimensions: pageRequestKind }
    ])
    expect(emf.publishesOf('page.request.session.resolutions')).toEqual([
      { value: 1, unit: 'Count', dimensions: pageRequestKind }
    ])
  })

  test('publishes no page request counts when callCounts.metrics.enabled is off', async () => {
    config.set(PAGE_REQUEST_METRICS_ENABLED_KEY, false)
    await server.inject({ method: 'GET', url: ORIGIN_URL })

    await requestTimesPublished(1)
    expect(emf.documentsWith(PAGE_REQUEST_BACKEND_CALLS)).toEqual([])
  })
})
