import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import {
  configureRecords,
  records,
  AMEND,
  DELETED,
  SUBMITTED
} from '../../engine/persistence/records.js'
import {
  configureSession,
  KNOWN_JOURNEYS_COOKIE
} from '../../engine/persistence/session.js'
import { records as recordsStub } from '../../services/persistence/records/stub/index.js'
import { assembleFulfilments } from '../../bridge/assemble-fulfilments.js'
import { projectAnswers } from '../../bridge/fulfilments/index.js'
import { session as sessionStub } from '../../services/persistence/session/stub.js'
import { createPath, hubPath, pagePath } from '../../config.js'
import { CYA_SLUG } from '../../shared/kit.js'

import { routes } from './controller.js'
import { authenticatedCredentials } from '../../engine/test-support.js'

const handlerOf = (method, pathSuffix) =>
  routes.find(
    (route) => route.method === method && route.path.endsWith(pathSuffix)
  ).handler

const listGet = handlerOf('GET', '/')
const amendPost = handlerOf('POST', '/amend')
const startPost = routes.find(
  (route) => route.method === 'POST' && route.path === createPath()
).handler

const buildRequest = ({
  knownJourneyIds = [],
  journeyId,
  query = {}
} = {}) => ({
  payload: {},
  params: journeyId ? { journeyId } : {},
  query,
  state: { [KNOWN_JOURNEYS_COOKIE]: knownJourneyIds },
  headers: {},
  auth: {
    isAuthenticated: true,
    credentials: authenticatedCredentials
  },
  app: {}
})

const buildH = () => {
  const captured = { cookies: {} }
  return {
    view: (template, context) => {
      captured.view = { template, context }
      return captured.view
    },
    redirect: (to) => {
      captured.redirect = to
      return { redirect: to }
    },
    state: (name, value) => {
      captured.cookies[name] = value
    },
    unstate: (name) => {
      delete captured.cookies[name]
    },
    captured
  }
}

const startDraft = async () => records.create()

const startSubmitted = async () => {
  const journey = await records.create()
  await records.finalise(journey.journeyId)
  return records.load({ journeyId: journey.journeyId })
}

describe('dashboard notifications list', () => {
  beforeAll(() => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
  })
  beforeEach(() => records.clear())

  it('Should show the empty state when the session knows no journeys', async () => {
    const h = buildH()
    await listGet(buildRequest(), h)
    expect(h.captured.view.context.notificationRows).toEqual([])
  })

  it('Should list a draft row with a Draft tag, its created date and a Resume action', async () => {
    const draft = await startDraft()
    const h = buildH()

    await listGet(buildRequest({ knownJourneyIds: [draft.journeyId] }), h)

    const [row] = h.captured.view.context.notificationRows
    expect(row.reference).toBe(draft.journeyId)
    expect(row.status).toEqual({
      text: 'Draft',
      classes: 'govuk-tag--blue'
    })
    expect(row.created).toEqual(expect.any(String))
    expect(row.submitted).toBe('')
    expect(row.actions.map((action) => action.text)).toEqual([
      'Resume',
      'Copy as new',
      'Delete'
    ])
    expect(row.actions[0].href).toBe(hubPath(draft.journeyId))
    expect(row.actions[1]).toMatchObject({
      postAction: pagePath(draft.journeyId, 'copy'),
      copyOrigin: 'dashboard',
      idempotencyKey: expect.any(String)
    })
    expect(row.actions[2].href).toBe(pagePath(draft.journeyId, 'delete'))
  })

  it('Should list a submitted row with a Submitted tag, its dates and View + Amend actions', async () => {
    const submitted = await startSubmitted()
    const h = buildH()

    await listGet(buildRequest({ knownJourneyIds: [submitted.journeyId] }), h)

    const [row] = h.captured.view.context.notificationRows
    expect(row.status).toEqual({
      text: 'Submitted',
      classes: 'govuk-tag--green'
    })
    expect(row.submitted).toEqual(expect.any(String))
    expect(row.submitted).toMatch(/^\d{1,2} \w{3} \d{4}$/)
    expect(row.actions.map((action) => action.text)).toEqual([
      'View',
      'Amend',
      'Copy as new',
      'Delete'
    ])
    expect(row.actions[0].href).toBe(pagePath(submitted.journeyId, CYA_SLUG))
    expect(row.actions[1].postAction).toBe(
      pagePath(submitted.journeyId, 'amend')
    )
    expect(row.actions[2].postAction).toBe(
      pagePath(submitted.journeyId, 'copy')
    )
    expect(row.actions[3].href).toBe(pagePath(submitted.journeyId, 'delete'))
  })

  it('Should list ONLY session-known journeys — never the wider store', async () => {
    const known = await startDraft()
    await startDraft()

    const h = buildH()
    await listGet(buildRequest({ knownJourneyIds: [known.journeyId] }), h)

    expect(
      h.captured.view.context.notificationRows.map((row) => row.reference)
    ).toEqual([known.journeyId])
  })

  it('Should build rich display fields using cached country and commodity reference data', async () => {
    const draft = await startDraft()
    await records.replaceFulfilment(
      draft.journeyId,
      assembleFulfilments({
        countryOfOrigin: 'FR',
        arrivalDateAtPort: { day: '5', month: '3', year: '2026' },
        consignor: { name: 'Consignor Ltd' },
        consignee: { name: 'Consignee Ltd' },
        commodityLines: [{ commoditySelection: 'Cow' }]
      })
    )
    const h = buildH()

    await listGet(buildRequest({ knownJourneyIds: [draft.journeyId] }), h)

    expect(h.captured.view.context.notificationRows[0]).toMatchObject({
      commodity: 'Cow',
      origin: 'France',
      arrival: '5 Mar 2026',
      consignor: 'Consignor Ltd',
      consignee: 'Consignee Ltd'
    })
  })

  it('Should default invalid page and sort query values', async () => {
    const draft = await startDraft()
    const h = buildH()

    await listGet(
      buildRequest({
        knownJourneyIds: [draft.journeyId],
        query: { page: '-4', sort: 'reference,sideways' }
      }),
      h
    )

    expect(h.captured.view.context).toMatchObject({
      currentPage: 1,
      sort: 'arrivalDate,desc',
      resultsLabel: 'Showing 1 Result'
    })
  })

  it('Should build result ranges and previous/next links while preserving sort', async () => {
    const journeys = await Promise.all(
      Array.from({ length: 21 }, () => startDraft())
    )
    const knownJourneyIds = journeys.map((journey) => journey.journeyId)
    const firstPage = buildH()
    const secondPage = buildH()

    await listGet(
      buildRequest({
        knownJourneyIds,
        query: { sort: 'createdAt,asc' }
      }),
      firstPage
    )
    await listGet(
      buildRequest({
        knownJourneyIds,
        query: { page: '2', sort: 'createdAt,asc' }
      }),
      secondPage
    )

    expect(firstPage.captured.view.context).toMatchObject({
      resultsLabel: 'Showing 1 to 20 of 21 Results',
      pagination: {
        next: {
          href: `${firstPage.captured.view.context.listAction}?page=2&sort=createdAt%2Casc`
        }
      }
    })
    expect(secondPage.captured.view.context).toMatchObject({
      currentPage: 2,
      resultsLabel: 'Showing 21 of 21 Results',
      pagination: {
        previous: {
          href: `${secondPage.captured.view.context.listAction}?sort=createdAt%2Casc`
        }
      }
    })
  })

  it('Should keep deleted journeys absent from the list', async () => {
    const deleted = await records.create()
    await records.softDelete(deleted.journeyId)
    const h = buildH()

    await listGet(buildRequest({ knownJourneyIds: [deleted.journeyId] }), h)

    expect(h.captured.view.context.notificationRows).toEqual([])
    expect((await records.load({ journeyId: deleted.journeyId })).status).toBe(
      DELETED
    )
  })
})

describe('dashboard row actions', () => {
  beforeAll(() => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
  })
  beforeEach(() => records.clear())

  it('Should expose no resume or view indirection routes', () => {
    expect(routes.some((route) => route.path.endsWith('/resume'))).toBe(false)
    expect(routes.some((route) => route.path.endsWith('/view'))).toBe(false)
  })

  it('Should amend a known submitted journey — unfrozen, re-entered at the hub, writable again', async () => {
    const submitted = await startSubmitted()
    const h = buildH()

    await amendPost(
      buildRequest({
        knownJourneyIds: [submitted.journeyId],
        journeyId: submitted.journeyId
      }),
      h
    )

    expect(h.captured.redirect).toBe(hubPath(submitted.journeyId))
    const amended = await records.load({ journeyId: submitted.journeyId })
    expect(amended.status).toBe(AMEND)
    await records.replaceFulfilment(
      submitted.journeyId,
      assembleFulfilments({ countryOfOrigin: 'FR' })
    )
  })

  it('Should list an amending journey with a yellow Amending tag', async () => {
    const submitted = await startSubmitted()
    await amendPost(
      buildRequest({
        knownJourneyIds: [submitted.journeyId],
        journeyId: submitted.journeyId
      }),
      buildH()
    )

    const h = buildH()
    await listGet(buildRequest({ knownJourneyIds: [submitted.journeyId] }), h)

    const [row] = h.captured.view.context.notificationRows
    expect(row.status).toEqual({
      text: 'Amending',
      classes: 'govuk-tag--yellow'
    })
    expect(row.submitted).toBe('')
    expect(row.actions.map((action) => action.text)).toEqual([
      'Resume',
      'Copy as new',
      'Cancel amendment',
      'Delete'
    ])
    expect(row.actions[2].href).toBe(
      pagePath(submitted.journeyId, 'cancel-amend')
    )
  })

  it('Should treat a repeated amend POST as a plain re-entry, not an error', async () => {
    const submitted = await startSubmitted()
    const request = buildRequest({
      knownJourneyIds: [submitted.journeyId],
      journeyId: submitted.journeyId
    })
    await amendPost(request, buildH())

    const h = buildH()
    await amendPost({ ...request, app: {} }, h)

    expect(h.captured.redirect).toBe(hubPath(submitted.journeyId))
    expect(
      (await records.load({ journeyId: submitted.journeyId })).status
    ).toBe(AMEND)
  })

  it('Should bounce an amend for a journey the session does not know and leave it frozen', async () => {
    const submitted = await startSubmitted()
    const h = buildH()

    await amendPost(
      buildRequest({ knownJourneyIds: [], journeyId: submitted.journeyId }),
      h
    )

    expect(h.captured.redirect).toBe('/')
    expect(
      (await records.load({ journeyId: submitted.journeyId })).status
    ).toBe(SUBMITTED)
  })

  it('Should mint a different copy key for every source row on a render', async () => {
    const first = await startDraft()
    const second = await startDraft()
    const h = buildH()

    await listGet(
      buildRequest({
        knownJourneyIds: [first.journeyId, second.journeyId]
      }),
      h
    )

    const keys = h.captured.view.context.notificationRows.map(
      (row) =>
        row.actions.find((action) => action.text === 'Copy as new')
          .idempotencyKey
    )
    expect(new Set(keys).size).toBe(2)
  })

  it('Should expose the delete success banner only after a delete redirect', async () => {
    const ordinary = buildH()
    const deleted = buildH()

    await listGet(buildRequest(), ordinary)
    await listGet({ ...buildRequest(), query: { deleted: '1' } }, deleted)

    expect(ordinary.captured.view.context.deletionSucceeded).toBe(false)
    expect(deleted.captured.view.context.deletionSucceeded).toBe(true)
  })

  it('Should expose the copy success banner only after a copy redirect', async () => {
    const ordinary = buildH()
    const copied = buildH()

    await listGet(buildRequest(), ordinary)
    await listGet(buildRequest({ query: { copied: '1' } }), copied)

    expect(ordinary.captured.view.context.copySucceeded).toBe(false)
    expect(copied.captured.view.context.copySucceeded).toBe(true)
  })
})

describe('dashboard start with an in-flight draft', () => {
  beforeAll(() => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
  })
  beforeEach(() => records.clear())

  it('Should start a NEW journey and keep the old one listed', async () => {
    const oldDraft = await startDraft()
    await records.replaceFulfilment(
      oldDraft.journeyId,
      assembleFulfilments({ countryOfOrigin: 'FR' })
    )
    const h = buildH()

    await startPost(buildRequest({ knownJourneyIds: [oldDraft.journeyId] }), h)

    const newJourneyId = h.captured.cookies[KNOWN_JOURNEYS_COOKIE].at(-1)
    expect(newJourneyId).not.toBe(oldDraft.journeyId)
    expect(h.captured.cookies[KNOWN_JOURNEYS_COOKIE]).toEqual([
      oldDraft.journeyId,
      newJourneyId
    ])
    expect(
      projectAnswers(
        (await records.load({ journeyId: oldDraft.journeyId })).fulfilment
      )
    ).toEqual({ countryOfOrigin: 'FR' })
  })
})
