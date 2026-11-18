import { SET_ID } from '../../../../../set.js'
import { describe, expect, it } from 'vitest'

import {
  journeyRequest,
  stubH,
  useStubbedJourney
} from '../../../../../../../engine/test-support.js'
import { itHoldsCopyAtEveryLeaf } from '../../../../../../../engine/copy-test-support.js'
import { store } from '../../../../../../../engine/store.js'
import { dispatchPages } from '../../index.js'

import * as confirmation from '../controller.js'
import { copy } from './copy.en.js'
import { copy as copyCy } from './copy.cy.js'

describe('confirmation copy module', () => {
  itHoldsCopyAtEveryLeaf(copy, copyCy)
})

describe('GET /confirmation', () => {
  useStubbedJourney(SET_ID, dispatchPages)

  it('Should supply the feature copy module for a submitted notification', async () => {
    const { journeyId } = await store.create()
    await store.submit(journeyId)
    const get = confirmation.routes.find(
      (route) => route.method === 'GET'
    ).handler
    const h = stubH()

    await get(journeyRequest(journeyId), h)

    expect(h.captured.view.context.copy).toBe(copy)
    expect(h.captured.view.context.pageTitle).toBe(copy.title)
  })
})
