import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { buildDispatch } from './flow/dispatch.js'
import { readyForCheckYourAnswers } from './flow/section-status.js'
import { store } from './engine/store.js'
import { configureRecords } from './engine/persistence/records.js'
import { configureSession } from './engine/persistence/session.js'
import { records as recordsStub } from './services/persistence/records/stub.js'
import { session as sessionStub } from './services/persistence/session/stub.js'
import { configureReadyForCheckYourAnswers } from './engine/read.js'
import { stubH, journeyRequest } from './engine/test-support.js'
import { dispatchPages } from './features/index.js'

import { routes } from './features/hub/controller.js'

const hubHandler = routes.find((route) => route.method === 'GET').handler

const renderHub = async (seed = {}) => {
  const journey = await store.create()
  await store.saveAnswers(journey.journeyId, seed)
  const h = stubH()
  await hubHandler(journeyRequest(journey.journeyId), h)
  return h.captured.view.context
}

const rowByTitle = (items, title) =>
  items.find((item) => item.title.text === title)

describe('#handler hub copy', () => {
  beforeAll(() => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    buildDispatch(dispatchPages)
    configureReadyForCheckYourAnswers(readyForCheckYourAnswers)
  })
  beforeEach(() => store.clear())

  it('Should report 0 of 7 tasks completed on a blank journey', async () => {
    expect((await renderHub()).progressLine).toBe(
      'You have completed 0 of 7 tasks.'
    )
  })

  it('Should render the always-open origin row as a blue "Not yet started" tag with a link', async () => {
    const originRow = rowByTitle(
      (await renderHub()).items,
      'Origin of the import'
    )
    expect(originRow.href).toBe('/prototype-standalone/live-animals/origin')
    expect(originRow.status).toEqual({
      tag: { text: 'Not yet started', classes: 'govuk-tag--blue' }
    })
  })

  it('Should render a completed section as a green "Completed" tag', async () => {
    const originRow = rowByTitle(
      (
        await renderHub({
          countryOfOrigin: 'FR',
          regionOfOriginCodeRequirement: 'no'
        })
      ).items,
      'Origin of the import'
    )
    expect(originRow.status).toEqual({
      tag: { text: 'Completed', classes: 'govuk-tag--green' }
    })
  })

  it('Should render a gated row as "Cannot start yet" text with NO link', async () => {
    const commoditiesRow = rowByTitle((await renderHub()).items, 'Commodities')
    expect(commoditiesRow.href).toBeUndefined()
    expect(commoditiesRow.status).toEqual({
      text: 'Cannot start yet',
      classes: 'govuk-task-list__status--cannot-start-yet'
    })
  })

  it('Should omit the commodity totals on a journey with no commodity lines', async () => {
    expect((await renderHub()).commodityTotals).toBeNull()
  })

  it('Should sum animals and packages over the commodity lines, treating blanks as 0', async () => {
    const { commodityTotals } = await renderHub({
      commodityLines: [
        { numberOfAnimalsQuantity: '25', numberOfPackages: '5' },
        { numberOfAnimalsQuantity: '3', numberOfPackages: '' },
        { numberOfAnimalsQuantity: '', numberOfPackages: '2' }
      ]
    })
    expect(commodityTotals).toEqual({ animals: 28, packages: 7 })
  })

  it('Should lock the Check and submit row until the journey is submit-ready (RULE 2)', async () => {
    const reviewRow = rowByTitle((await renderHub()).items, 'Check and submit')
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
