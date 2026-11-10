import { SET_ID } from '../../../set.js'
import { describe, expect, it } from 'vitest'

import {
  createPath,
  dashboardPath,
  hubPath,
  pagePath
} from '../../../../../shared/paths.js'
import {
  driveHandler,
  journeyRequest,
  stubH,
  useStubbedJourney
} from '../../../../../engine/test-support.js'
import { dispatchPages } from '../features/index.js'
import {
  entryGuardTarget,
  guardedJourneyPath,
  leaveJourneyLink
} from './entry-guard.js'

const ORIGIN_SLUG = 'origin'
const JOURNEY = { journeyId: 'j-1' }
const ANSWERED = { countryOfOrigin: 'FR' }

describe('entry guard', () => {
  useStubbedJourney(SET_ID, dispatchPages)

  const guardFor = (options) =>
    driveHandler(entryGuardTarget, { pathOf: hubPath, ...options })

  it('Should exempt the dashboard, the entry page and its children, and start', () => {
    expect(guardedJourneyPath(dashboardPath())).toBe(false)
    expect(guardedJourneyPath('/')).toBe(false)
    expect(guardedJourneyPath(pagePath('j-1', ORIGIN_SLUG))).toBe(false)
    expect(guardedJourneyPath(pagePath('j-1', 'origin/anything'))).toBe(false)
    expect(guardedJourneyPath(createPath())).toBe(false)
    expect(guardedJourneyPath('/some-other-prototype/origin')).toBe(false)
  })

  it.each(['amend', 'cancel-amend', 'copy', 'delete'])(
    'Should exempt the %s action',
    (action) => {
      expect(guardedJourneyPath(pagePath('j-1', action))).toBe(false)
    }
  )

  it.each([
    ['Overview', (journeyId) => hubPath(journeyId)],
    [
      'the review page',
      (journeyId) => pagePath(journeyId, 'notification-view')
    ],
    ['the declaration', (journeyId) => pagePath(journeyId, 'declaration')],
    [
      'the confirmation page',
      (journeyId) => pagePath(journeyId, 'confirmation')
    ]
  ])(
    'Should send %s of a notification with no entered answer to the entry page',
    async (_name, pathFor) => {
      const { journeyId, response } = await guardFor({
        pathOf: pathFor
      })
      expect(response).toBe(pagePath(journeyId, ORIGIN_SLUG))
    }
  )

  it('Should log the redirect once with the journey and the requested path', async () => {
    const { journeyId, logger } = await guardFor()

    expect(logger.entries).toEqual([
      {
        level: 'info',
        fields: { journeyId, path: hubPath(journeyId) },
        message: 'No answer entered, sent to the first page'
      }
    ])
  })

  it('Should let a journey with an entered answer straight through', async () => {
    const { response } = await guardFor({ seed: ANSWERED })
    expect(response).toBeNull()
  })

  it('Should treat a journey whose only answer is a flow-only key as having none', async () => {
    const { journeyId, response } = await guardFor({
      seed: { declaration: 'confirmed' }
    })
    expect(response).toBe(pagePath(journeyId, ORIGIN_SLUG))
  })

  it('Should never consult the journey for an exempt path', async () => {
    const request = journeyRequest(undefined, { path: createPath() })
    expect(await entryGuardTarget(request, stubH(request))).toBeNull()
  })
})

describe('#leaveJourneyLink — Overview, else the dashboard until an answer is entered', () => {
  it('Should be the dashboard for a notification with no entered answer', () => {
    expect(leaveJourneyLink(JOURNEY, {})).toBe(dashboardPath())
  })

  it('Should be Overview once an answer is entered', () => {
    expect(leaveJourneyLink(JOURNEY, ANSWERED)).toBe(hubPath('j-1'))
  })
})
