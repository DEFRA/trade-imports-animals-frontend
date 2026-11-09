import { SET_ID } from '../../../../set.js'
import { describe, expect, it } from 'vitest'

import { store } from '../../../../../../engine/store.js'
import {
  addressBookRefusingAddresses,
  driveHandler,
  reviewChangeLinkQuery,
  trailQuery,
  journeyRequest,
  resetMocksAndConfigAfterTests,
  stubH,
  useStubbedJourney
} from '../../../../../../engine/test-support.js'
import { requiredEarlierAnswers } from '../../../../test-support.js'
import { dispatchPages } from '../index.js'
import { itSendsBackToWhereTheTraderCameFrom } from '../../test-support.js'
import {
  CYA_SLUG,
  TRAIL_START,
  withTrail
} from '../../../../../../shared/kit.js'
import { addressesPage } from './page.js'
import { pagePath } from '../../../../../../shared/paths.js'
import { consignmentContactSelectPage } from '../contact/page.js'
import {
  BOS_TAURUS_ROW,
  FELIS_CATUS_ROW
} from '../commodities/search/test-support.js'

import * as addresses from './controller.js'
import { PARTIES } from './parties.js'
import { expectAddedAddressBannerShownOnce } from './test-support.js'

const getAddresses = addresses.routes.find(
  (route) => route.method === 'GET'
).handler
const postAddresses = addresses.routes.find(
  (route) => route.method === 'POST'
).handler

const driveAddresses = async (seed, startingFrom = []) =>
  driveHandler(getAddresses, { seed, startingFrom })
const sectionsOf = (result) => result.view.context.sections
const sectionTitled = (sections, title) =>
  sections.find((section) => section.title === title)
const PLACE_OF_ORIGIN_TITLE = 'Place of origin'
const SWITZERLAND = 'Switzerland'
const CPH_PATH_RETURNING_TO_ADDRESSES = 'cph-number?return=addresses'
const CPH_TITLE = 'County parish holding (CPH) number'
const CONSIGNOR_TITLE = 'Consignor'
const CONSIGNOR_SELECT_SLUG = 'consignors/select'
const ASTRA_NAME = 'Astra Rosales'
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

describe('GET addresses — added address banner', () => {
  useStubbedJourney(SET_ID, dispatchPages)

  it('Should show the added address banner with the address name, then clear its cookie so it shows only once', async () => {
    await expectAddedAddressBannerShownOnce(getAddresses)
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
        href: pagePath(result.journeyId, CPH_PATH_RETURNING_TO_ADDRESSES),
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
      changeHref: pagePath(result.journeyId, CPH_PATH_RETURNING_TO_ADDRESSES)
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
    addressBookRefusingAddresses()

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

describe('GET addresses — the trail', () => {
  useStubbedJourney(SET_ID, dispatchPages)

  it('Should carry the trail into every party add link', async () => {
    const result = await driveAddresses({}, [
      { query: reviewChangeLinkQuery() }
    ])

    for (const party of PARTIES) {
      expect(sectionTitled(sectionsOf(result), party.title).addLink.href).toBe(
        `${pagePath(result.journeyId, party.slug)}?from=${CYA_SLUG}`
      )
    }
  })

  it('Should carry the trail into a chosen party Change and Edit details links', async () => {
    const result = await driveAddresses({ consignor: { name: ASTRA_NAME } }, [
      { query: reviewChangeLinkQuery() }
    ])

    expect(
      sectionTitled(sectionsOf(result), CONSIGNOR_TITLE).chosen
    ).toMatchObject({
      changeHref: `${pagePath(result.journeyId, CONSIGNOR_SELECT_SLUG)}?from=${CYA_SLUG}`,
      editDetailsHref: `${pagePath(result.journeyId, 'consignors/edit')}?return=addresses&from=${CYA_SLUG}`
    })
  })

  it('Should join the trail to the query string the CPH link already has', async () => {
    const result = await driveAddresses({ commodityLines: CPH_ASKED_LINES }, [
      { query: reviewChangeLinkQuery() }
    ])

    expect(sectionTitled(sectionsOf(result), CPH_TITLE).addLink.href).toBe(
      `${pagePath(result.journeyId, CPH_PATH_RETURNING_TO_ADDRESSES)}&from=${CYA_SLUG}`
    )
  })

  it('Should render plain links when the request carries no trail', async () => {
    const result = await driveAddresses({})

    expect(
      sectionTitled(sectionsOf(result), CONSIGNOR_TITLE).addLink.href
    ).toBe(pagePath(result.journeyId, CONSIGNOR_SELECT_SLUG))
  })

  itSendsBackToWhereTheTraderCameFrom(getAddresses, {
    previousPage: 'accompanying-documents'
  })
})

describe('POST addresses — where Save and continue goes', () => {
  useStubbedJourney(SET_ID, dispatchPages)

  it.each([
    [
      'opened from a Change link',
      [{ query: reviewChangeLinkQuery() }],
      [CYA_SLUG]
    ],
    [
      'opened from the overview',
      [{ query: trailQuery(TRAIL_START.overview) }],
      [TRAIL_START.overview]
    ]
  ])(
    'Should go on to the contact address with the trail extended by this page when continuing %s',
    async (_start, startingFrom, trailBefore) => {
      const result = await driveHandler(postAddresses, {
        seed: requiredEarlierAnswers(),
        startingFrom
      })

      expect(result.response.redirect).toBe(
        withTrail(
          pagePath(result.journeyId, consignmentContactSelectPage.slug),
          [...trailBefore, addressesPage.slug]
        )
      )
    }
  )
})
