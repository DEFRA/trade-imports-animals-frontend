import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { buildDispatch } from './flow/dispatch.js'
import { readyForQuote } from './flow/section-status.js'
import { JOURNEY_COOKIE } from './engine/journey.js'
import { store } from './engine/store.js'
import { configureReadyForQuote } from './engine/read.js'
import { dispatchPages } from './features/index.js'

import { addonCopy, routes } from './features/hub/controller.js'

/**
 * T2 REGRESSION — the hub owns its task-link copy, so add-on rows must show
 * authored human hints, never the internal page ids they used to be derived
 * from (`drivers`, `modifications-describe`, `protected-ncd-years`). The
 * shared E2E navigates rows by TITLE and never observes the hint, so these
 * cases pin the rendered HINT text against the running handler. The missing
 * -copy lookup is pinned too: it fails loud rather than rendering `undefined`.
 */

const stubH = () => {
  const captured = {}
  return {
    view: (view, ctx) => {
      captured.view = { view, ctx }
      return captured.view
    },
    redirect: (to) => ({ redirect: to }),
    state: () => {},
    captured
  }
}

const hubHandler = routes.find((route) => route.method === 'GET').handler

/** Render the hub over a seeded journey; return its task-list items. */
const renderHub = (seed = {}) => {
  const journey = store.create()
  store.saveAnswers(journey.journeyId, seed)
  const h = stubH()
  const request = {
    params: {},
    query: {},
    state: { [JOURNEY_COOKIE]: journey.journeyId }
  }
  hubHandler(request, h)
  return h.captured.view.ctx.items
}

/** The rendered row whose title matches `title`. */
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
