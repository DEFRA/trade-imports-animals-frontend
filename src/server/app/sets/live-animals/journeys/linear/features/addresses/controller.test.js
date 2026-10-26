import { SET_ID } from '../../../../set.js'
import { describe, expect, it } from 'vitest'

import { store } from '../../../../../../engine/store.js'
import {
  addressBookCountriesServing,
  driveHandler,
  journeyRequest,
  resetMocksAndConfigAfterTests,
  stubH,
  useStubbedJourney
} from '../../../../../../engine/test-support.js'
import { dispatchPages } from '../index.js'
import { hubPath, pagePath } from '../../../../../../shared/paths.js'
import {
  BOS_TAURUS_ROW,
  FELIS_CATUS_ROW
} from '../commodities/search/test-support.js'

import * as addresses from './controller.js'
import { PARTIES } from './parties.js'

const getAddresses = addresses.routes.find(
  (route) => route.method === 'GET'
).handler
const postAddresses = addresses.routes.find(
  (route) => route.method === 'POST'
).handler

const driveAddresses = async (seed, query = {}) =>
  driveHandler(getAddresses, { seed, query })
const sectionsOf = (result) => result.view.context.sections
const sectionTitled = (sections, title) =>
  sections.find((section) => section.title === title)
const PLACE_OF_ORIGIN_TITLE = 'Place of origin'
const SWITZERLAND = 'Switzerland'
const CPH_SLUG = 'cph-number?return=addresses'
const CPH_TITLE = 'County parish holding (CPH) number'
const CONSIGNOR_TITLE = 'Consignor'
const CONSIGNOR_SELECT_SLUG = 'consignors/select'
const ASTRA_NAME = 'Astra Rosales'
const CYA_SLUG = 'notification-view'
const CPH_ASKED_LINES = [BOS_TAURUS_ROW]

describe('GET addresses — sections for parties not yet chosen', () => {
  useStubbedJourney(SET_ID, dispatchPages)

  it('Should list the five parties in order, each with its heading, hint and named add link and no chosen address', async () => {
    const result = await driveAddresses({})

    expect(sectionsOf(result)).toEqual(
      [
        [
          PLACE_OF_ORIGIN_TITLE,
          'Add a place of origin',
          'place-of-origin/select'
        ],
        ['Consignor', 'Add a consignor', 'consignors/select'],
        ['Consignee', 'Add a consignee', 'consignees/select'],
        ['Importer', 'Add an importer', 'importers/select'],
        [
          'Place of destination',
          'Add a place of destination',
          'destinations/select'
        ]
      ].map(([title, text, slug], index) => ({
        id: PARTIES[index].id,
        title,
        hint: PARTIES[index].hint,
        hiddenSuffix: title.toLowerCase(),
        addLink: { href: pagePath(result.journeyId, slug), text }
      }))
    )
  })
})

describe('GET addresses — conditional CPH section', () => {
  useStubbedJourney(SET_ID, dispatchPages)

  it('Should list only the five party sections when no CPH-triggering commodity line exists', async () => {
    const result = await driveAddresses({
      commodityLines: [FELIS_CATUS_ROW]
    })

    expect(sectionsOf(result).map(({ title }) => title)).toEqual(
      PARTIES.map(({ title }) => title)
    )
  })

  it('Should end with an empty CPH section offering the add link into cph-number when a CPH-triggering commodity line exists', async () => {
    const result = await driveAddresses({ commodityLines: CPH_ASKED_LINES })

    expect(sectionsOf(result).at(-1)).toEqual({
      id: 'cph',
      title: CPH_TITLE,
      hint: 'The county parish holding (CPH) number identifies the holding where the animals will be kept.',
      hiddenSuffix: CPH_TITLE.toLowerCase(),
      addLink: {
        href: pagePath(result.journeyId, CPH_SLUG),
        text: 'Add a CPH number'
      }
    })
  })

  it('Should show the stored (slash-stripped) CPH value on one line with a Change link when answered', async () => {
    const result = await driveAddresses({
      commodityLines: CPH_ASKED_LINES,
      countyParishHoldingCph: '123456789'
    })

    expect(sectionTitled(sectionsOf(result), CPH_TITLE).chosen).toEqual({
      lines: ['123456789'],
      changeHref: pagePath(result.journeyId, CPH_SLUG)
    })
  })
})

describe('GET addresses — sections for parties copied onto the notification', () => {
  useStubbedJourney(SET_ID, dispatchPages)
  resetMocksAndConfigAfterTests()

  it('Should show a chosen consignor as its name and address lines, ending with the locality, postcode and country, offering Change and Edit details', async () => {
    const result = await driveAddresses({
      consignor: {
        name: ASTRA_NAME,
        address: {
          addressLine1: '43 East Hague Extension',
          addressLine2: 'Floor 2',
          townOrCity: 'Bern',
          postcode: '30055',
          countryCode: 'CH'
        }
      }
    })

    expect(sectionTitled(sectionsOf(result), CONSIGNOR_TITLE)).toMatchObject({
      hiddenSuffix: 'consignor',
      chosen: {
        name: ASTRA_NAME,
        lines: [
          '43 East Hague Extension',
          'Floor 2',
          `Bern, 30055, ${SWITZERLAND}`
        ],
        changeHref: pagePath(result.journeyId, CONSIGNOR_SELECT_SLUG),
        editDetailsHref: `${pagePath(result.journeyId, 'consignors/edit')}?return=addresses`
      }
    })
  })

  it('Should join the county into the last address line and skip blank parts', async () => {
    const result = await driveAddresses({
      consignor: {
        name: ASTRA_NAME,
        address: {
          addressLine1: '1 Lane',
          addressLine2: '',
          townOrCity: 'Bern',
          county: 'Bern',
          postcode: '',
          countryCode: 'CH'
        }
      }
    })

    expect(
      sectionTitled(sectionsOf(result), CONSIGNOR_TITLE).chosen.lines
    ).toEqual(['1 Lane', `Bern, Bern, ${SWITZERLAND}`])
  })

  it('Should show only the country after the name for a party held with just a country', async () => {
    const result = await driveAddresses({
      consignor: { name: ASTRA_NAME, address: { countryCode: 'CH' } }
    })

    expect(
      sectionTitled(sectionsOf(result), CONSIGNOR_TITLE).chosen
    ).toMatchObject({ name: ASTRA_NAME, lines: [SWITZERLAND] })
  })

  it('Should show the held party in its section from the copy alone when the address book refuses every address request', async () => {
    addressBookCountriesServing()

    const result = await driveAddresses({
      placeOfOrigin: {
        name: 'Origin Copy',
        address: { addressLine1: '1 Farm Lane', countryCode: 'CH' }
      }
    })

    expect(
      sectionTitled(sectionsOf(result), PLACE_OF_ORIGIN_TITLE).chosen
    ).toMatchObject({
      name: 'Origin Copy',
      lines: ['1 Farm Lane', SWITZERLAND]
    })
  })
})

describe('GET addresses — frozen parties on submitted notification', () => {
  useStubbedJourney(SET_ID, dispatchPages)

  it('Should show the name held on the copy once submitted', async () => {
    const frozenName = 'Frozen At Submit'
    const journey = await store.create()
    await store.seedAnswers(journey.journeyId, {
      placeOfOrigin: {
        name: frozenName,
        address: { addressLine1: '1 Lane', countryCode: 'GB' }
      }
    })
    await store.submit(journey.journeyId)

    const h = stubH()
    await getAddresses(journeyRequest(journey.journeyId), h)

    expect(
      sectionTitled(h.captured.view.context.sections, PLACE_OF_ORIGIN_TITLE)
        .chosen.name
    ).toBe(frozenName)
  })
})

describe('GET addresses — change context', () => {
  useStubbedJourney(SET_ID, dispatchPages)

  it('Should carry change context into every party add link', async () => {
    const result = await driveAddresses({}, { change: '1' })

    for (const party of PARTIES) {
      expect(sectionTitled(sectionsOf(result), party.title).addLink.href).toBe(
        `${pagePath(result.journeyId, party.slug)}?change=1`
      )
    }
  })

  it('Should carry change context into a chosen party Change and Edit details links', async () => {
    const result = await driveAddresses(
      { consignor: { name: ASTRA_NAME } },
      { change: '1' }
    )

    expect(
      sectionTitled(sectionsOf(result), CONSIGNOR_TITLE).chosen
    ).toMatchObject({
      changeHref: `${pagePath(result.journeyId, CONSIGNOR_SELECT_SLUG)}?change=1`,
      editDetailsHref: `${pagePath(result.journeyId, 'consignors/edit')}?return=addresses&change=1`
    })
  })

  it('Should leave the CPH link alone, its slug already carrying a query string', async () => {
    const result = await driveAddresses(
      { commodityLines: CPH_ASKED_LINES },
      { change: '1' }
    )

    expect(sectionTitled(sectionsOf(result), CPH_TITLE).addLink.href).toBe(
      pagePath(result.journeyId, CPH_SLUG)
    )
  })

  it('Should render plain links when not changing', async () => {
    const result = await driveAddresses({})

    expect(
      sectionTitled(sectionsOf(result), CONSIGNOR_TITLE).addLink.href
    ).toBe(pagePath(result.journeyId, CONSIGNOR_SELECT_SLUG))
  })

  it('Should point Back at check your answers under change context', async () => {
    const result = await driveAddresses({}, { change: '1' })

    expect(result.view.context.backLink).toBe(
      pagePath(result.journeyId, CYA_SLUG)
    )
  })

  it('Should point Back at the task list, never the review, while amending', async () => {
    const { journeyId, view } = await driveHandler(getAddresses, {
      query: { change: '1' },
      amend: true
    })

    expect(view.context.backLink).toBe(hubPath(journeyId))
  })

  it('Should point Back at the task list when not changing', async () => {
    const result = await driveAddresses({})

    expect(result.view.context.backLink).toBe(hubPath(result.journeyId))
  })
})

describe('POST addresses — change context', () => {
  useStubbedJourney(SET_ID, dispatchPages)

  it('Should exit to check your answers when continuing under change context', async () => {
    const result = await driveHandler(postAddresses, { query: { change: '1' } })

    expect(result.response.redirect).toBe(pagePath(result.journeyId, CYA_SLUG))
  })

  it('Should follow the ordinary flow when continuing without change context', async () => {
    const result = await driveHandler(postAddresses, {})

    expect(result.response.redirect).toBe(hubPath(result.journeyId))
  })
})
