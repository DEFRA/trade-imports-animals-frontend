import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { configureRecords } from '../../../../../engine/persistence/records.js'
import { configureSession } from '../../../../../engine/persistence/session.js'
import { store } from '../../../../../engine/store.js'
import { journeyRequest, stubH } from '../../../../../engine/test-support.js'
import { records as recordsStub } from '../../../../../services/persistence/records/stub/index.js'
import { session as sessionStub } from '../../../../../services/persistence/session/stub.js'
import { pagePath } from '../../../../../shared/paths.js'
import {
  entryGuardTarget,
  guardedJourneyPath,
  parseJourneyPath
} from './entry-guard.js'

describe('live-animals entry guard paths', () => {
  beforeAll(() => {
    configureRecords('live-animals', recordsStub)
    configureSession('live-animals', sessionStub)
  })

  beforeEach(() => store.clear())

  it('extracts the bare journey id from a prefixed request path', () => {
    expect(parseJourneyPath('/live-animals/notifications/J/origin')).toEqual({
      journeyId: 'J',
      slug: 'origin'
    })
  })

  it('guards prefixed deep links but not the prefixed create route', () => {
    expect(guardedJourneyPath('/live-animals/notifications/J/origin')).toBe(
      true
    )
    expect(guardedJourneyPath('/live-animals/notifications')).toBe(false)
  })

  it('redirects a fresh prefixed deep link to the entry filter', async () => {
    const journey = await store.create()
    const target = await entryGuardTarget(
      journeyRequest(journey.journeyId, {
        path: pagePath(journey.journeyId, 'origin')
      }),
      stubH()
    )

    expect(target).toBe(pagePath(journey.journeyId, 'import-type'))
  })
})
