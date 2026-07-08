import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { buildDispatch } from './flow/dispatch.js'
import { readyForQuote } from './flow/section-status.js'
import { store } from './engine/store.js'
import { configureReadyForQuote } from './engine/read.js'
import { stubH, journeyRequest } from './engine/test-support.js'
import { dispatchPages } from './features/index.js'

import { routes } from './features/hub/controller.js'

/**
 * The shared E2E navigates rows by TITLE and never observes the hint — so the
 * rendered hint text must be pinned here.
 */

const hubHandler = routes.find((route) => route.method === 'GET').handler

const renderHub = (seed = {}) => {
  const journey = store.create()
  store.saveAnswers(journey.journeyId, seed)
  const h = stubH()
  hubHandler(journeyRequest(journey.journeyId), h)
  return h.captured.view.context.items
}

const rowByTitle = (items, title) =>
  items.find((item) => item.title.text === title)

describe('#handler hub copy', () => {
  beforeAll(() => {
    buildDispatch(dispatchPages)
    configureReadyForQuote(readyForQuote)
  })
  beforeEach(() => store.clear())

  it('Should render the Check and submit row linking to the check-your-answers page', () => {
    const reviewRow = rowByTitle(renderHub(), 'Check and submit')

    expect(reviewRow.hint.text).toBe(
      'Check your answers before you submit the notification'
    )
    // The review section's declaration obligation is always-live, so the
    // section derives reachable on a fresh journey — the row must link out
    // (entering at the CYA), never fall back to the hub.
    expect(reviewRow.href).toBe(
      '/prototype-standalone/live-animals/notification-view'
    )
    expect(reviewRow.status).toEqual({
      tag: { text: 'Not started', classes: 'govuk-tag--grey' }
    })
  })
})
