import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import {
  configureRecords,
  records,
  IN_PROGRESS,
  SUBMITTED
} from '../../engine/persistence/records.js'
import {
  configureSession,
  JOURNEY_COOKIE,
  KNOWN_JOURNEYS_COOKIE,
  STUB_USER
} from '../../engine/persistence/session.js'
import { records as recordsStub } from '../../services/persistence/records/stub.js'
import { migrateNameKeyedAnswersToFulfilments } from '../../bridge/name-keyed-migration.js'
import { projectAnswers } from '../../bridge/fulfilments.js'
import { session as sessionStub } from '../../services/persistence/session/stub.js'

import { routes } from './controller.js'

const handlerOf = (method, pathSuffix) =>
  routes.find(
    (route) => route.method === method && route.path.endsWith(pathSuffix)
  ).handler

const listGet = handlerOf('GET', '/home')
const resumeGet = handlerOf('GET', '/resume')
const viewGet = handlerOf('GET', '/view')
const amendPost = handlerOf('POST', '/amend')
const startPost = handlerOf('POST', '/start')

const buildRequest = ({ knownJourneyIds = [], journeyId } = {}) => ({
  payload: {},
  params: journeyId ? { journeyId } : {},
  query: {},
  state: { [KNOWN_JOURNEYS_COOKIE]: knownJourneyIds },
  headers: {},
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

const startDraft = async () => records.create({ userId: STUB_USER })

const startSubmitted = async () => {
  const journey = await records.create({ userId: STUB_USER })
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
    expect(row.status.text).toBe('Draft')
    expect(row.created).toEqual(expect.any(String))
    expect(row.submitted).toBe('Not submitted')
    expect(row.actions).toEqual([
      {
        text: 'Resume',
        href: expect.stringContaining(`${draft.journeyId}/resume`)
      }
    ])
  })

  it('Should list a submitted row with a Submitted tag, its dates and View + Amend actions', async () => {
    const submitted = await startSubmitted()
    const h = buildH()

    await listGet(buildRequest({ knownJourneyIds: [submitted.journeyId] }), h)

    const [row] = h.captured.view.context.notificationRows
    expect(row.status.text).toBe('Submitted')
    expect(row.submitted).toEqual(expect.any(String))
    expect(row.submitted).not.toBe('Not submitted')
    expect(row.actions).toEqual([
      {
        text: 'View',
        href: expect.stringContaining(`${submitted.journeyId}/view`)
      },
      {
        text: 'Amend',
        postAction: expect.stringContaining(`${submitted.journeyId}/amend`)
      }
    ])
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
})

describe('dashboard row actions', () => {
  beforeAll(() => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
  })
  beforeEach(() => records.clear())

  it('Should resume a known draft — active journey repointed, redirect to the hub', async () => {
    const draft = await startDraft()
    const h = buildH()

    await resumeGet(
      buildRequest({
        knownJourneyIds: [draft.journeyId],
        journeyId: draft.journeyId
      }),
      h
    )

    expect(h.captured.redirect).toContain('/hub')
    expect(h.captured.cookies[JOURNEY_COOKIE]).toBe(draft.journeyId)
  })

  it('Should bounce a resume for a journey the session does not know back to the dashboard', async () => {
    const draft = await startDraft()
    const h = buildH()

    await resumeGet(
      buildRequest({ knownJourneyIds: [], journeyId: draft.journeyId }),
      h
    )

    expect(h.captured.redirect).toContain('/home')
    expect(h.captured.cookies[JOURNEY_COOKIE]).toBeUndefined()
  })

  it('Should open the read view for a known submitted journey', async () => {
    const submitted = await startSubmitted()
    const h = buildH()

    await viewGet(
      buildRequest({
        knownJourneyIds: [submitted.journeyId],
        journeyId: submitted.journeyId
      }),
      h
    )

    expect(h.captured.redirect).toContain('/notification-view')
    expect(h.captured.cookies[JOURNEY_COOKIE]).toBe(submitted.journeyId)
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

    expect(h.captured.redirect).toContain('/hub')
    expect(h.captured.cookies[JOURNEY_COOKIE]).toBe(submitted.journeyId)
    const amended = await records.load({ journeyId: submitted.journeyId })
    expect(amended.status).toBe(IN_PROGRESS)
    await records.replaceFulfilment(
      submitted.journeyId,
      migrateNameKeyedAnswersToFulfilments({ countryOfOrigin: 'FR' })
    )
  })

  it('Should list an amending journey as Draft again', async () => {
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
    expect(row.status.text).toBe('Draft')
    expect(row.submitted).toBe('Not submitted')
    expect(row.actions.map((action) => action.text)).toEqual(['Resume'])
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

    expect(h.captured.redirect).toContain('/hub')
    expect(
      (await records.load({ journeyId: submitted.journeyId })).status
    ).toBe(IN_PROGRESS)
  })

  it('Should bounce an amend for a journey the session does not know and leave it frozen', async () => {
    const submitted = await startSubmitted()
    const h = buildH()

    await amendPost(
      buildRequest({ knownJourneyIds: [], journeyId: submitted.journeyId }),
      h
    )

    expect(h.captured.redirect).toContain('/home')
    expect(
      (await records.load({ journeyId: submitted.journeyId })).status
    ).toBe(SUBMITTED)
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
      migrateNameKeyedAnswersToFulfilments({ countryOfOrigin: 'FR' })
    )
    const h = buildH()

    await startPost(buildRequest({ knownJourneyIds: [oldDraft.journeyId] }), h)

    const newJourneyId = h.captured.cookies[JOURNEY_COOKIE]
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
