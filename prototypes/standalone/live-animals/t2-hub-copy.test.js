import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { buildDispatch } from './flow/dispatch.js'
import { readyForQuote } from './flow/section-status.js'
import { store } from './engine/store.js'
import { configureReadyForQuote } from './engine/read.js'
import { stubH, journeyRequest } from './engine/test-support.js'
import { dispatchPages } from './features/index.js'

import { addonCopy, routes } from './features/hub/controller.js'

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

  it('Should render authored add-on hints, not internal page ids', () => {
    const items = renderHub({
      addons: ['named-driver', 'modifications', 'protected-ncd']
    })

    expect(rowByTitle(items, 'Add a named driver').hint.text).toBe(
      'People you want insured to drive your vehicle'
    )
    expect(rowByTitle(items, 'Declare vehicle modifications').hint.text).toBe(
      'Changes to your vehicle and their value'
    )
    expect(rowByTitle(items, 'Protect your no-claims discount').hint.text).toBe(
      'Keep your discount if you make a claim'
    )
  })

  it('Should never leak an internal page id into an add-on hint', () => {
    const items = renderHub({
      addons: ['named-driver', 'modifications', 'protected-ncd']
    })
    const pageIds = [
      'drivers',
      'modifications-describe',
      'modifications-value',
      'protected-ncd-years'
    ]

    for (const item of items) {
      const hint = item.hint?.text ?? ''
      for (const pageId of pageIds) {
        expect(hint).not.toContain(pageId)
      }
    }
  })

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

  it('Should give the Email row a hint that does not echo its title', () => {
    const emailRow = rowByTitle(renderHub(), 'Email')

    expect(emailRow.hint.text).toBe('Where we send your quote')
    expect(emailRow.hint.text).not.toBe(emailRow.title.text)
  })
})

describe('#addonCopy', () => {
  it('Should return the authored title and hint for a known add-on', () => {
    expect(addonCopy('named-driver')).toEqual({
      title: 'Add a named driver',
      hint: 'People you want insured to drive your vehicle'
    })
  })

  it('Should throw for an add-on section with no authored hub copy', () => {
    expect(() => addonCopy('unmapped-addon')).toThrow(/unmapped-addon/)
  })
})
