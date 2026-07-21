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

const allItems = (context) => context.groups.flatMap((group) => group.items)

const rowByTitle = (context, title) =>
  allItems(context).find((item) => item.title.text === title)

const unlockedSeed = {
  countryOfOrigin: 'FR',
  commodityLines: [{ commoditySelection: 'Cat' }]
}

describe('#handler hub copy', () => {
  beforeAll(() => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    buildDispatch(dispatchPages)
    configureReadyForCheckYourAnswers(readyForCheckYourAnswers)
  })
  beforeEach(() => store.clear())

  it('Should title the hub Overview with the design chrome — back link and Return to dashboard, no breadcrumbs, no progress line', async () => {
    const context = await renderHub()
    expect(context.heading).toBe('Overview')
    expect(context.pageTitle).toBe('Overview')
    expect(context.backLink).toBe('/prototype-standalone/live-animals/home')
    expect(context.dashboardHref).toBe(
      '/prototype-standalone/live-animals/home'
    )
    expect(context.breadcrumbs).toBe(false)
    expect(context.progressLine).toBeUndefined()
  })

  it('Should render the six numbered groups in the design order', async () => {
    const { groups } = await renderHub()
    expect(groups.map((group) => group.caption)).toEqual([
      '1. About the consignment',
      '2. Commodity details',
      '3. Movement',
      '4. Addresses',
      '5. Documents',
      '6. Check and submit'
    ])
  })

  it('Should render the ten page-level rows in their groups on an unlocked journey (transit stays absent)', async () => {
    const { groups } = await renderHub(unlockedSeed)
    expect(
      groups.map((group) => group.items.map((item) => item.title.text))
    ).toEqual([
      [
        'Where is this consignment coming from?',
        'What are you importing?',
        'Main reason for importing'
      ],
      ['Additional commodity details', 'Animal identification details'],
      ['Arrival details', 'Transporter'],
      ['Roles and addresses', 'Contact address'],
      ['Uploaded documents'],
      ['Check and submit']
    ])
  })

  it('Should render the always-open origin row as a blue "Not yet started" tag with a link', async () => {
    const originRow = rowByTitle(
      await renderHub(),
      'Where is this consignment coming from?'
    )
    expect(originRow.href).toBe('/prototype-standalone/live-animals/origin')
    expect(originRow.status).toEqual({
      tag: { text: 'Not yet started', classes: 'govuk-tag--blue' }
    })
  })

  it('Should render a completed row as a green "Completed" tag', async () => {
    const originRow = rowByTitle(
      await renderHub({
        countryOfOrigin: 'FR',
        regionOfOriginCodeRequirement: 'no'
      }),
      'Where is this consignment coming from?'
    )
    expect(originRow.status).toEqual({
      tag: { text: 'Completed', classes: 'govuk-tag--green' }
    })
  })

  it('Should render a gated row as "Cannot start yet" text with NO link', async () => {
    const commoditiesRow = rowByTitle(
      await renderHub(),
      'What are you importing?'
    )
    expect(commoditiesRow.href).toBeUndefined()
    expect(commoditiesRow.status).toEqual({
      text: 'Cannot start yet',
      classes: 'govuk-task-list__status--cannot-start-yet'
    })
  })

  it('Should split the commodities and identification rows over one collection — line data completes one, identifiers the other', async () => {
    const context = await renderHub({
      countryOfOrigin: 'FR',
      commodityLines: [
        {
          commoditySelection: 'Cow',
          speciesSelection: '1148346',
          numberOfPackages: '5',
          numberOfAnimalsQuantity: '25'
        }
      ]
    })
    expect(rowByTitle(context, 'What are you importing?').status).toEqual({
      tag: { text: 'Completed', classes: 'govuk-tag--green' }
    })
    const identificationRow = rowByTitle(
      context,
      'Animal identification details'
    )
    expect(identificationRow.status).toEqual({
      tag: { text: 'Not yet started', classes: 'govuk-tag--blue' }
    })
    expect(identificationRow.href).toBe(
      '/prototype-standalone/live-animals/commodities/identification'
    )
  })

  it('Should show the conditional transit row only for an overland means of transport', async () => {
    const withoutMeans = await renderHub(unlockedSeed)
    expect(rowByTitle(withoutMeans, 'Transit countries')).toBeUndefined()

    const byAir = await renderHub({
      ...unlockedSeed,
      meansOfTransport: 'Airplane'
    })
    expect(rowByTitle(byAir, 'Transit countries')).toBeUndefined()

    const byRoad = await renderHub({
      ...unlockedSeed,
      meansOfTransport: 'Road Vehicle'
    })
    const transitRow = rowByTitle(byRoad, 'Transit countries')
    expect(transitRow.href).toBe(
      '/prototype-standalone/live-animals/transit-countries'
    )
    expect(transitRow.status).toEqual({ text: 'Optional' })
  })

  it('Should render the optional documents row as an Optional status', async () => {
    const documentsRow = rowByTitle(
      await renderHub(unlockedSeed),
      'Uploaded documents'
    )
    expect(documentsRow.status).toEqual({ text: 'Optional' })
  })

  it('Should enter each movement row at its first page', async () => {
    const context = await renderHub(unlockedSeed)
    expect(rowByTitle(context, 'Arrival details').href).toBe(
      '/prototype-standalone/live-animals/port-of-entry'
    )
    expect(rowByTitle(context, 'Transporter').href).toBe(
      '/prototype-standalone/live-animals/transporters'
    )
    expect(rowByTitle(context, 'Roles and addresses').href).toBe(
      '/prototype-standalone/live-animals/addresses'
    )
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
    const reviewRow = rowByTitle(await renderHub(), 'Check and submit')
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
