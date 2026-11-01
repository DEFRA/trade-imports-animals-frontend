import { SET_ID } from '../../../../set.js'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import {
  configureRecords,
  records,
  AMEND,
  DELETED
} from '../../../../../../engine/persistence/records.js'
import {
  configureSession,
  knownJourneysCookie,
  openingRunCookie
} from '../../../../../../engine/persistence/session.js'
import { records as recordsStub } from '../../../../../../services/persistence/records/stub/index.js'
import { assembleFulfilments } from '../../../../../../bridge/assemble-fulfilments.js'
import { projectAnswers } from '../../../../../../bridge/fulfilments/index.js'
import { session as sessionStub } from '../../../../../../services/persistence/session/stub.js'
import { createRoutePath } from '../../../../../../shared/paths.js'
import { SET_BASE } from '../../../../set.js'
import { CYA_SLUG, SURFACES } from '../../../../../../shared/kit.js'
import { RUN_ACTIVE } from '../../../../../../flow/run-state.js'

import { routes } from './controller.js'
import { journeyRequest, stubH } from '../../../../../../engine/test-support.js'
import { CATTLE_CODE } from '../../../../services/commodities/rules.js'

const hubUrl = (journeyId) => `${SET_BASE}/notifications/${journeyId}`
const pageUrl = (journeyId, slug) => `${hubUrl(journeyId)}/${slug}`

const COPY_AS_NEW_ACTION = 'Copy as new'
const CREATED_AT_ASCENDING_SORT = 'createdAt,asc'
const ORIGIN_SLUG = 'origin'

const handlerOf = (method, pathSuffix) =>
  routes.find(
    (route) => route.method === method && route.path.endsWith(pathSuffix)
  ).handler

const listGet = handlerOf('GET', '/')
const amendPost = handlerOf('POST', '/amend')
const startPost = routes.find(
  (route) => route.method === 'POST' && route.path === createRoutePath()
).handler

const startDraft = async () => records.create()

const startSubmitted = async () => {
  const journey = await records.create()
  await records.finalise(journey.journeyId, undefined, journey.concurrencyToken)
  return records.load({ journeyId: journey.journeyId })
}

const renderList = async (overrides = {}) => {
  const request = journeyRequest(undefined, overrides)
  const h = stubH(request)
  await listGet(request, h)
  return h.captured.view.context
}

const postAmend = async (journeyId, overrides = {}) => {
  const request = journeyRequest(journeyId, overrides)
  const h = stubH(request)
  const response = await amendPost(request, h)
  return { response, h }
}

describe('dashboard notifications list', () => {
  beforeAll(() => {
    configureRecords(SET_ID, recordsStub)
    configureSession(SET_ID, sessionStub)
  })
  beforeEach(() => records.clear())

  it('Should show the empty state when the session knows no journeys', async () => {
    const context = await renderList()

    expect(context.notificationRows).toEqual([])
  })

  it('Should list a draft row with a Draft tag, its created date and a Resume action', async () => {
    const draft = await startDraft()

    const context = await renderList({ knownJourneyIds: [draft.journeyId] })

    const [row] = context.notificationRows
    expect(row.reference).toBe(draft.journeyId)
    expect(row.status).toEqual({
      text: 'Draft',
      classes: 'govuk-tag--blue'
    })
    expect(row.created).toEqual(expect.any(String))
    expect(row.submitted).toBe('')
    expect(row.actions.map((action) => action.text)).toEqual([
      'Resume',
      COPY_AS_NEW_ACTION,
      'Delete'
    ])
    expect(row.actions[0].href).toBe(hubUrl(draft.journeyId))
    expect(row.actions[1]).toMatchObject({
      postAction: pageUrl(draft.journeyId, 'copy'),
      copyOrigin: 'dashboard',
      concurrencyToken: expect.anything()
    })
    expect(row.actions[2].href).toBe(pageUrl(draft.journeyId, 'delete'))
  })

  it('Should list a submitted row with a Submitted tag, its dates and View + Amend actions', async () => {
    const submitted = await startSubmitted()

    const context = await renderList({ knownJourneyIds: [submitted.journeyId] })

    const [row] = context.notificationRows
    expect(row.status).toEqual({
      text: 'Submitted',
      classes: 'govuk-tag--green'
    })
    expect(row.submitted).toEqual(expect.any(String))
    expect(row.submitted).toMatch(/^\d{1,2} \w{3} \d{4}$/)
    expect(row.actions.map((action) => action.text)).toEqual([
      'View',
      'Amend',
      COPY_AS_NEW_ACTION,
      'Delete'
    ])
    expect(row.actions[0].href).toBe(pageUrl(submitted.journeyId, CYA_SLUG))
    expect(row.actions[1].postAction).toBe(
      pageUrl(submitted.journeyId, 'amend')
    )
    expect(row.actions[2].postAction).toBe(pageUrl(submitted.journeyId, 'copy'))
    expect(row.actions[3].href).toBe(pageUrl(submitted.journeyId, 'delete'))
  })

  it('Should list ONLY session-known journeys — never the wider store', async () => {
    const known = await startDraft()
    await startDraft()

    const context = await renderList({ knownJourneyIds: [known.journeyId] })

    expect(context.notificationRows.map((row) => row.reference)).toEqual([
      known.journeyId
    ])
  })

  it('Should show the origin country by name and the commodity as the first line CN code', async () => {
    const draft = await startDraft()
    await records.replaceFulfilment(
      draft.journeyId,
      assembleFulfilments({
        countryOfOrigin: 'FR',
        arrivalDateAtPort: { day: '5', month: '3', year: '2026' },
        consignor: { name: 'Consignor Ltd' },
        consignee: { name: 'Consignee Ltd' },
        commodityLines: [{ commodityCode: CATTLE_CODE }]
      })
    )

    const context = await renderList({ knownJourneyIds: [draft.journeyId] })

    expect(context.notificationRows[0]).toMatchObject({
      commodity: CATTLE_CODE,
      origin: 'France',
      arrival: '5 Mar 2026',
      consignor: 'Consignor Ltd',
      consignee: 'Consignee Ltd'
    })
  })

  it('Should default invalid page and sort query values', async () => {
    const draft = await startDraft()

    const context = await renderList({
      knownJourneyIds: [draft.journeyId],
      query: { page: '-4', sort: 'reference,sideways' }
    })

    expect(context).toMatchObject({
      currentPage: 1,
      sort: 'arrivalDate,desc',
      resultsLabel: 'Showing 1 Result'
    })
  })

  it('Should build result ranges and previous/next links while preserving sort', async () => {
    const journeys = await Promise.all(
      Array.from({ length: 21 }, () => startDraft())
    )
    const known = {
      knownJourneyIds: journeys.map((journey) => journey.journeyId)
    }

    const firstPage = await renderList({
      ...known,
      query: { sort: CREATED_AT_ASCENDING_SORT }
    })
    const secondPage = await renderList({
      ...known,
      query: { page: '2', sort: CREATED_AT_ASCENDING_SORT }
    })

    expect(firstPage).toMatchObject({
      resultsLabel: 'Showing 1 to 20 of 21 Results',
      pagination: {
        next: {
          href: `${firstPage.listAction}?page=2&sort=createdAt%2Casc`
        }
      }
    })
    expect(secondPage).toMatchObject({
      currentPage: 2,
      resultsLabel: 'Showing 21 of 21 Results',
      pagination: {
        previous: {
          href: `${secondPage.listAction}?sort=createdAt%2Casc`
        }
      }
    })
  })

  it('Should trim an exact reference search and preserve its sort', async () => {
    const first = await startDraft()
    const second = await startDraft()

    const context = await renderList({
      knownJourneyIds: [first.journeyId, second.journeyId],
      query: {
        sort: CREATED_AT_ASCENDING_SORT,
        referenceNumber: `  ${second.journeyId}  `
      }
    })

    expect(context).toMatchObject({
      referenceNumber: second.journeyId,
      sort: CREATED_AT_ASCENDING_SORT,
      resultsLabel: 'Showing 1 Result',
      listQuerySuffix: `?sort=createdAt%2Casc&referenceNumber=${second.journeyId}`
    })
    expect(context.notificationRows.map((row) => row.reference)).toEqual([
      second.journeyId
    ])
  })

  it('Should show the delivered empty-state copy when a reference has no match', async () => {
    const draft = await startDraft()

    const context = await renderList({
      knownJourneyIds: [draft.journeyId],
      query: { referenceNumber: 'GBN-AG-26-ZZZZZZ' }
    })

    expect(context).toMatchObject({
      notificationRows: [],
      referenceNumber: 'GBN-AG-26-ZZZZZZ',
      resultsLabel: 'No notifications found',
      pagination: null
    })
  })

  it('Should keep deleted journeys absent from the list', async () => {
    const deleted = await records.create()
    await records.softDelete(deleted.journeyId)

    const context = await renderList({ knownJourneyIds: [deleted.journeyId] })

    expect(context.notificationRows).toEqual([])
    expect((await records.load({ journeyId: deleted.journeyId })).status).toBe(
      DELETED
    )
  })
})

describe('dashboard content width', () => {
  beforeAll(() => {
    configureRecords(SET_ID, recordsStub)
    configureSession(SET_ID, sessionStub)
  })

  it('Should render the notification list as a display surface', async () => {
    const context = await renderList()

    expect(context.contentColumnClass).toBe(SURFACES.display)
  })
})

describe('dashboard row actions', () => {
  beforeAll(() => {
    configureRecords(SET_ID, recordsStub)
    configureSession(SET_ID, sessionStub)
  })
  beforeEach(() => records.clear())

  it('Should expose no resume or view indirection routes', () => {
    expect(routes.some((route) => route.path.endsWith('/resume'))).toBe(false)
    expect(routes.some((route) => route.path.endsWith('/view'))).toBe(false)
  })

  it('Should amend a known submitted journey — unfrozen, re-entered at the hub, writable again', async () => {
    const submitted = await startSubmitted()

    const { response } = await postAmend(submitted.journeyId)

    expect(response.redirect).toBe(hubUrl(submitted.journeyId))
    const amended = await records.load({ journeyId: submitted.journeyId })
    expect(amended.status).toBe(AMEND)
    await records.replaceFulfilment(
      submitted.journeyId,
      assembleFulfilments({ countryOfOrigin: 'FR' })
    )
  })

  it('Should list an amending journey with a yellow Amend tag', async () => {
    const submitted = await startSubmitted()
    await postAmend(submitted.journeyId)

    const context = await renderList({ knownJourneyIds: [submitted.journeyId] })

    const [row] = context.notificationRows
    expect(row.status).toEqual({
      text: 'Amend',
      classes: 'govuk-tag--yellow'
    })
    expect(row.submitted).toBe('')
    expect(row.actions.map((action) => action.text)).toEqual([
      'Resume',
      COPY_AS_NEW_ACTION,
      'Cancel amendment',
      'Delete'
    ])
    expect(row.actions[2].href).toBe(
      pageUrl(submitted.journeyId, 'cancel-amend')
    )
  })

  it('Should treat a repeated amend POST as a plain re-entry, not an error', async () => {
    const submitted = await startSubmitted()
    await postAmend(submitted.journeyId)

    const { response } = await postAmend(submitted.journeyId)

    expect(response.redirect).toBe(hubUrl(submitted.journeyId))
    expect(
      (await records.load({ journeyId: submitted.journeyId })).status
    ).toBe(AMEND)
  })

  it('Should open an amend for a submitted journey the session does not know at its hub and leave it amending', async () => {
    const submitted = await startSubmitted()

    const { response } = await postAmend(submitted.journeyId, {
      knownJourneyIds: []
    })

    expect(response.redirect).toBe(hubUrl(submitted.journeyId))
    expect(
      (await records.load({ journeyId: submitted.journeyId })).status
    ).toBe(AMEND)
  })

  it('Should send an amend for a deleted journey back to the dashboard carrying the amend-refused flag', async () => {
    const deleted = await records.create()
    await records.softDelete(deleted.journeyId)

    const { response } = await postAmend(deleted.journeyId)

    expect(response.redirect).toBe(`${SET_BASE}?amendRefused=1`)
    expect((await records.load({ journeyId: deleted.journeyId })).status).toBe(
      DELETED
    )
  })

  it('Should carry each row source concurrencyToken onto its copy action', async () => {
    const first = await startDraft()
    const second = await startDraft()

    const context = await renderList({
      knownJourneyIds: [first.journeyId, second.journeyId]
    })

    context.notificationRows.forEach((row) => {
      const copyAction = row.actions.find(
        (action) => action.text === COPY_AS_NEW_ACTION
      )
      expect(copyAction.concurrencyToken).toBeDefined()
    })
  })

  it('Should expose the delete success banner only after a delete redirect', async () => {
    const ordinary = await renderList()
    const deleted = await renderList({ query: { deleted: '1' } })

    expect(ordinary.deletionSucceeded).toBe(false)
    expect(deleted.deletionSucceeded).toBe(true)
  })

  it('Should expose the copy success banner only after a copy redirect', async () => {
    const ordinary = await renderList()
    const copied = await renderList({ query: { copied: '1' } })

    expect(ordinary.copySucceeded).toBe(false)
    expect(copied.copySucceeded).toBe(true)
  })

  it('Should expose the amend-refused banner only after a refused-amend redirect', async () => {
    const ordinary = await renderList()
    const refused = await renderList({ query: { amendRefused: '1' } })

    expect(ordinary.amendRefused).toBe(false)
    expect(refused.amendRefused).toBe(true)
  })
})

describe('dashboard start with an in-flight draft', () => {
  beforeAll(() => {
    configureRecords(SET_ID, recordsStub)
    configureSession(SET_ID, sessionStub)
  })
  beforeEach(() => records.clear())

  it('Should start a NEW journey and keep the old one listed', async () => {
    const oldDraft = await startDraft()
    await records.replaceFulfilment(
      oldDraft.journeyId,
      assembleFulfilments({ countryOfOrigin: 'FR' })
    )
    const request = journeyRequest(undefined, {
      knownJourneyIds: [oldDraft.journeyId]
    })
    const h = stubH(request)

    await startPost(request, h)

    const newJourneyId = h.cookies[knownJourneysCookie()].at(-1)
    expect(newJourneyId).not.toBe(oldDraft.journeyId)
    expect(h.cookies[knownJourneysCookie()]).toEqual([
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

describe('dashboard start opens the opening run', () => {
  beforeAll(() => {
    configureRecords(SET_ID, recordsStub)
    configureSession(SET_ID, sessionStub)
  })
  beforeEach(() => records.clear())

  it('Should begin the opening run for the new notification before any page is answered', async () => {
    const request = journeyRequest()
    const h = stubH(request)

    const response = await startPost(request, h)

    const newJourneyId = h.cookies[knownJourneysCookie()].at(-1)
    expect(response.redirect).toBe(pageUrl(newJourneyId, ORIGIN_SLUG))
    expect(h.cookies[openingRunCookie()]).toEqual({
      [newJourneyId]: RUN_ACTIVE
    })
  })

  it('Should leave an earlier notification run record intact', async () => {
    const request = journeyRequest(undefined, {
      state: { [openingRunCookie()]: { 'an-earlier-journey': RUN_ACTIVE } }
    })
    const h = stubH(request)

    await startPost(request, h)

    const newJourneyId = h.cookies[knownJourneysCookie()].at(-1)
    expect(h.cookies[openingRunCookie()]).toEqual({
      'an-earlier-journey': RUN_ACTIVE,
      [newJourneyId]: RUN_ACTIVE
    })
  })

  it('Should NOT begin a run when an existing notification is amended', async () => {
    const submitted = await startSubmitted()

    const { response, h } = await postAmend(submitted.journeyId)

    expect(response.redirect).toBe(hubUrl(submitted.journeyId))
    expect(openingRunCookie() in h.cookies).toBe(false)
  })
})
