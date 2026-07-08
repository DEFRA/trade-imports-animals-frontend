import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { buildDispatch } from './flow/dispatch.js'
import { readyForCheckYourAnswers } from './flow/section-status.js'
import { store } from './engine/store.js'
import { configureReadyForCheckYourAnswers } from './engine/read.js'
import { stubH, journeyRequest } from './engine/test-support.js'
import { dispatchPages } from './features/index.js'

import { routes } from './features/hub/controller.js'

const hubHandler = routes.find((route) => route.method === 'GET').handler

const renderHub = (seed = {}) => {
  const journey = store.create()
  store.saveAnswers(journey.journeyId, seed)
  const h = stubH()
  hubHandler(journeyRequest(journey.journeyId), h)
  return h.captured.view.context
}

const rowByTitle = (items, title) =>
  items.find((item) => item.title.text === title)

describe('#handler hub copy', () => {
  beforeAll(() => {
    buildDispatch(dispatchPages)
    configureReadyForCheckYourAnswers(readyForCheckYourAnswers)
  })
  beforeEach(() => store.clear())

  it('Should report 0 of 7 tasks completed on a blank journey', () => {
    expect(renderHub().progressLine).toBe('You have completed 0 of 7 tasks.')
  })

  it('Should render the always-open origin row as a blue "Not yet started" tag with a link', () => {
    const originRow = rowByTitle(renderHub().items, 'Origin of the import')
    expect(originRow.href).toBe('/prototype-standalone/live-animals/origin')
    expect(originRow.status).toEqual({
      tag: { text: 'Not yet started', classes: 'govuk-tag--blue' }
    })
  })

  it('Should render a completed section as a green "Completed" tag', () => {
    const originRow = rowByTitle(
      renderHub({ countryOfOrigin: 'FR', regionOfOriginCodeRequirement: 'no' })
        .items,
      'Origin of the import'
    )
    expect(originRow.status).toEqual({
      tag: { text: 'Completed', classes: 'govuk-tag--green' }
    })
  })

  it('Should render a gated row as "Cannot start yet" text with NO link', () => {
    const commoditiesRow = rowByTitle(renderHub().items, 'Commodities')
    expect(commoditiesRow.href).toBeUndefined()
    expect(commoditiesRow.status).toEqual({
      text: 'Cannot start yet',
      classes: 'govuk-task-list__status--cannot-start-yet'
    })
  })

  it('Should lock the Check and submit row until the journey is submit-ready (RULE 2)', () => {
    const reviewRow = rowByTitle(renderHub().items, 'Check and submit')
    expect(reviewRow.hint.text).toBe(
      'Check your answers before you submit the notification'
    )
    expect(reviewRow.href).toBeUndefined()
    expect(reviewRow.status).toEqual({
      text: 'Cannot start yet',
      classes: 'govuk-task-list__status--cannot-start-yet'
    })
  })
})
