import { beforeEach, describe, expect, it, vi } from 'vitest'
import createFetchMock from 'vitest-fetch-mock'

import { hubPath, pagePath } from '../../../../../../shared/paths.js'
import { configureRecords } from '../../../../../../engine/persistence/records.js'
import {
  configureSession,
  SESSION_COOKIES
} from '../../../../../../engine/persistence/session.js'
import { records as realRecords } from '../../../../../../services/persistence/records/real/index.js'
import { session as sessionStub } from '../../../../../../services/persistence/session/stub.js'
import {
  authenticatedCredentials,
  stubH
} from '../../../../../../engine/test-support.js'
import { routes as dashboardRoutes } from './controller.js'
import { routes as notificationActionRoutes } from '../notification-actions/controller.js'

// The invariant, not the line: every action the dashboard offers on a listed
// row can actually be performed. Bound to the REAL records adapter because the
// stub's list filters by the session breadcrumb, which hides the whole class —
// in real mode the list is unscoped, so the normal returning user sees rows the
// session never adopted.

const fetchMocker = createFetchMock(vi)
fetchMocker.enableMocks()

const backendBaseUrl = 'http://localhost:8085'
const fulfilmentsUrl = `${backendBaseUrl}/notification-fulfilments`
const notificationsUrl = `${backendBaseUrl}/notifications`

const sourceRef = 'GBN-AG-26-SRC001'
const copyRef = 'GBN-AG-26-CPY001'

const COPY_AS_NEW_ACTION = 'Copy as new'
const AMEND_ACTION = 'Amend'

const listGet = dashboardRoutes.find(
  (route) => route.method === 'GET' && route.path === '/'
).handler
const amendPost = dashboardRoutes.find(
  (route) => route.method === 'POST' && route.path.endsWith('/amend')
).handler
const copyPost = notificationActionRoutes.find(
  (route) => route.method === 'POST'
).handler

const listedNotification = {
  referenceNumber: sourceRef,
  status: 'SUBMITTED',
  created: '2026-07-23T09:00:00'
}

const fulfilmentDocument = (id, status) => ({
  id,
  status,
  createdAt: '2026-07-23T09:00:00',
  submittedAt: '2026-07-24T09:00:00',
  fulfilments: []
})

const listPage = {
  content: [listedNotification],
  page: 1,
  size: 20,
  totalElements: 1,
  totalPages: 1
}

const backendResponses = {
  [`GET ${fulfilmentsUrl}/${sourceRef}`]: fulfilmentDocument(
    sourceRef,
    'SUBMITTED'
  ),
  [`POST ${fulfilmentsUrl}/${sourceRef}/copy`]: fulfilmentDocument(
    copyRef,
    'DRAFT'
  ),
  [`POST ${fulfilmentsUrl}/${sourceRef}/amend`]: fulfilmentDocument(
    sourceRef,
    'AMEND'
  ),
  [`POST ${notificationsUrl}/${sourceRef}/amend`]: {
    referenceNumber: sourceRef,
    status: 'AMEND'
  }
}

const routeBackend = ({ method, url }) => {
  if (method === 'GET' && url.startsWith(`${notificationsUrl}?`)) {
    return JSON.stringify(listPage)
  }
  const body = backendResponses[`${method} ${url}`]
  return body ? JSON.stringify(body) : { status: 404, body: 'Not Found' }
}

const unadoptedRequest = (overrides = {}) => ({
  payload: {},
  params: {},
  query: {},
  headers: {},
  auth: {
    isAuthenticated: true,
    credentials: authenticatedCredentials
  },
  app: {},
  state: { [SESSION_COOKIES.knownJourneys]: [] },
  ...overrides
})

const renderedRow = async () => {
  const h = stubH()
  await listGet(unadoptedRequest(), h)
  return h.captured.view.context.notificationRows[0]
}

const actionNamed = (row, text) =>
  row.actions.find((action) => action.text === text)

const journeyIdOf = (postAction) => postAction.split('/').at(-2)

const postedTo = (url) =>
  fetchMocker
    .requests()
    .filter((request) => request.method === 'POST' && request.url === url)

describe('actions offered on a listed row', () => {
  beforeEach(() => {
    fetchMocker.resetMocks()
    fetchMocker.mockResponse(routeBackend)
    configureRecords(realRecords)
    configureSession(sessionStub)
  })

  it('Should copy a notification this session never opened, from the row the dashboard rendered', async () => {
    const row = await renderedRow()
    const copyAction = actionNamed(row, COPY_AS_NEW_ACTION)
    expect(copyAction.postAction).toBe(pagePath(sourceRef, 'copy'))

    const response = await copyPost(
      unadoptedRequest({
        params: { journeyId: journeyIdOf(copyAction.postAction) },
        payload: {
          idempotencyKey: copyAction.idempotencyKey,
          copyOrigin: 'dashboard'
        }
      }),
      stubH()
    )

    expect(response.redirect).toBe(hubPath(copyRef))
  })

  it('Should amend a notification this session never opened, from the row the dashboard rendered', async () => {
    const row = await renderedRow()
    const amendAction = actionNamed(row, AMEND_ACTION)
    expect(amendAction.postAction).toBe(pagePath(sourceRef, 'amend'))

    const response = await amendPost(
      unadoptedRequest({
        params: { journeyId: journeyIdOf(amendAction.postAction) }
      }),
      stubH()
    )

    expect(response.redirect).toBe(hubPath(sourceRef))
    expect(postedTo(`${fulfilmentsUrl}/${sourceRef}/amend`)).toHaveLength(1)
  })
})
