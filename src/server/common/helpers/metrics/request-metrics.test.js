import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import hapi from '@hapi/hapi'
import vision from '@hapi/vision'
import { vi } from 'vitest'

import { routePage, routeSection } from './request-metrics.js'
import { callCounts } from '../call-counts/call-counts.js'
import { config } from '../../../../config/config.js'
import { readEmfDocuments } from '../../test-helpers/emf-documents.js'

const NAMESPACE_KEY = 'metrics.namespace'
const TEST_NAMESPACE = 'test-namespace'
const REQUEST_TIMER = 'http.server.requests'
const VALIDATION_FAILURE = 'journey.validation.failure'

const documentsHolding = (logSpy, metricName) =>
  readEmfDocuments(logSpy).filter((document) => metricName in document)

describe('route section and page', () => {
  test.each([
    ['/live-animals/notifications/{journeyId}/origin', 'origin', 'origin'],
    [
      '/live-animals/notifications/{journeyId}/consignment/contact/edit',
      'consignment',
      'consignment/contact/edit'
    ],
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
  ])('%s is in section %s and shows page %s', (routePath, section, page) => {
    expect(routeSection(routePath)).toBe(section)
    expect(routePage(routePath)).toBe(page)
  })
})

describe('request metrics', () => {
  const originalNamespace = config.get(NAMESPACE_KEY)
  let templateDirectory
  let server
  let logSpy

  beforeAll(async () => {
    templateDirectory = await mkdtemp(join(tmpdir(), 'request-metrics-'))
    await writeFile(join(templateDirectory, 'contact.html'), 'page')
  })

  afterAll(async () => {
    await rm(templateDirectory, { recursive: true })
  })

  beforeEach(async () => {
    config.set(NAMESPACE_KEY, TEST_NAMESPACE)
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    server = hapi.server()
    await server.register([callCounts, vision])
    server.views({
      engines: { html: { compile: () => () => 'page' } },
      path: templateDirectory
    })
    server.route([
      {
        method: 'GET',
        path: '/live-animals/notifications/{journeyId}/origin',
        handler: () => 'origin'
      },
      {
        method: 'POST',
        path: '/live-animals/notifications/{journeyId}/consignment/contact/edit',
        handler: (request, h) =>
          h.view('contact.html', {
            errorSummary: request.payload.refused ? { errorList: [] } : null
          })
      },
      { method: 'GET', path: '/health', handler: () => 'ok' }
    ])
  })

  afterEach(async () => {
    config.set(NAMESPACE_KEY, originalNamespace)
    logSpy.mockRestore()
    await server.stop({ timeout: 0 })
  })

  test('a page request publishes its time tagged method, section and status class', async () => {
    await server.inject({
      method: 'GET',
      url: '/live-animals/notifications/j-1/origin'
    })

    await vi.waitFor(() =>
      expect(documentsHolding(logSpy, REQUEST_TIMER)).toHaveLength(1)
    )
    const [document] = documentsHolding(logSpy, REQUEST_TIMER)
    expect(document._aws.CloudWatchMetrics[0]).toEqual({
      Namespace: TEST_NAMESPACE,
      Dimensions: [['method', 'section', 'status.class']],
      Metrics: [{ Name: REQUEST_TIMER, Unit: 'Milliseconds' }]
    })
    expect(document).toEqual(
      expect.objectContaining({
        method: 'GET',
        section: 'origin',
        'status.class': '2xx',
        [REQUEST_TIMER]: expect.any(Number)
      })
    )
  })

  test('a request no route matches is published in section unmatched with status class 4xx', async () => {
    await server.inject({ method: 'GET', url: '/nowhere' })

    await vi.waitFor(() =>
      expect(documentsHolding(logSpy, REQUEST_TIMER)).toHaveLength(1)
    )
    const [document] = documentsHolding(logSpy, REQUEST_TIMER)
    expect(document.section).toBe('unmatched')
    expect(document['status.class']).toBe('4xx')
  })

  test('a health check is not published', async () => {
    await server.inject({ method: 'GET', url: '/health' })
    await server.inject({
      method: 'GET',
      url: '/live-animals/notifications/j-1/origin'
    })

    await vi.waitFor(() =>
      expect(documentsHolding(logSpy, REQUEST_TIMER)).toHaveLength(1)
    )
    expect(documentsHolding(logSpy, REQUEST_TIMER)[0].section).toBe('origin')
  })

  test('a posted answer shown again with an error summary counts one validation failure for its page', async () => {
    await server.inject({
      method: 'POST',
      url: '/live-animals/notifications/j-1/consignment/contact/edit',
      payload: { refused: 'yes' }
    })

    await vi.waitFor(() =>
      expect(documentsHolding(logSpy, VALIDATION_FAILURE)).toHaveLength(1)
    )
    const [document] = documentsHolding(logSpy, VALIDATION_FAILURE)
    expect(document._aws.CloudWatchMetrics[0].Dimensions).toEqual([['page']])
    expect(document.page).toBe('consignment/contact/edit')
    expect(document[VALIDATION_FAILURE]).toBe(1)
  })

  test('a posted answer shown with no error summary counts no validation failure', async () => {
    await server.inject({
      method: 'POST',
      url: '/live-animals/notifications/j-1/consignment/contact/edit',
      payload: {}
    })

    await vi.waitFor(() =>
      expect(documentsHolding(logSpy, REQUEST_TIMER)).toHaveLength(1)
    )
    expect(documentsHolding(logSpy, VALIDATION_FAILURE)).toEqual([])
  })
})
