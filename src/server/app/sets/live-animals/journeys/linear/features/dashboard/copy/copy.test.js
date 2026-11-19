import { SET_ID } from '../../../../../set.js'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import {
  configureRecords,
  records
} from '../../../../../../../engine/persistence/records.js'
import {
  configureSession,
  knownJourneysCookie
} from '../../../../../../../engine/persistence/session.js'
import { records as recordsStub } from '../../../../../../../services/persistence/records/stub/index.js'
import { session as sessionStub } from '../../../../../../../services/persistence/session/stub.js'

import { itHoldsCopyAtEveryLeaf } from '../../../../../../../engine/copy-test-support.js'
import { routes } from '../controller.js'
import { copy } from './copy.en.js'
import { copy as copyCy } from './copy.cy.js'

describe('#copy', () => {
  itHoldsCopyAtEveryLeaf(copy, copyCy, ['sample'])

  it('Should interpolate the hidden action label', () => {
    expect(copy.actionHidden('GBN-1')).toBe('notification GBN-1')
  })

  it('Should use the delivered dashboard search copy', () => {
    expect(copy.search).toEqual({
      heading: 'Filter notifications',
      label: 'Keyword or reference',
      button: 'Search',
      noResults: 'No notifications found'
    })
  })
})

describe('GET /', () => {
  beforeAll(() => {
    configureRecords(SET_ID, recordsStub)
    configureSession(SET_ID, sessionStub)
  })
  beforeEach(() => records.clear())

  it('Should supply the feature copy module and the shared chrome copy', async () => {
    const listGet = routes.find(
      (route) => route.method === 'GET' && route.path === '/'
    ).handler
    const h = {
      view: (template, context) => ({ template, context })
    }
    const { context } = await listGet(
      {
        payload: {},
        params: {},
        query: {},
        state: { [knownJourneysCookie()]: [] },
        headers: {},
        app: {}
      },
      h
    )
    expect(context.copy).toBe(copy)
    expect(context.pageTitle).toBe(copy.title)
    expect(context.sharedCopy.journeyStrip.draft).toBe('Draft')
  })
})
