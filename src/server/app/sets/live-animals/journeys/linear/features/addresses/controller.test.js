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
import {
  itSendsBackToWhereTheTraderCameFrom,
  petConsignmentSeed
} from '../../test-support.js'
import {
  CYA_SLUG,
  TRAIL_START,
  withTrail
} from '../../../../../../shared/kit.js'
import { addressesPage } from './page.js'
import { permanentAddressPage } from '../permanent-address/page.js'
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
const PERMANENT_ADDRESS_TITLE = 'Permanent address'
const PERMANENT_ADDRESS_PATH_RETURNING_TO_ADDRESSES = `${permanentAddressPage.slug}?return=addresses`
const CAT_1_MICROCHIP = 'MICROCHIP-1'
const CAT_2_MICROCHIP = 'MICROCHIP-2'

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

describe('GET addresses — conditional permanent address section', () => {
  useStubbedJourney(SET_ID, dispatchPages)

  it('Should list the five party sections then the permanent address section, and no CPH section, for a cats-only consignment', async () => {
    const result = await driveAddresses({
      commodityLines: [FELIS_CATUS_ROW]
    })

    expect(sectionsOf(result).map(({ title }) => title)).toEqual([
      ...PARTIES.map(({ title }) => title),
      PERMANENT_ADDRESS_TITLE
    ])
  })

  it('Should list no permanent address section for a cattle-only consignment', async () => {
    const result = await driveAddresses({ commodityLines: [BOS_TAURUS_ROW] })

    expect(
      sectionTitled(sectionsOf(result), PERMANENT_ADDRESS_TITLE)
    ).toBeUndefined()
  })

  it('Should offer the permanent address section before any animal has one, with its add link carrying the return marker', async () => {
    const { commodityLines } = petConsignmentSeed({
      row: FELIS_CATUS_ROW,
      units: [{ animalIdentifierMicrochip: CAT_1_MICROCHIP }]
    })
    const result = await driveAddresses({ commodityLines })

    expect(sectionTitled(sectionsOf(result), PERMANENT_ADDRESS_TITLE)).toEqual({
      id: 'permanentAddress',
      title: PERMANENT_ADDRESS_TITLE,
      hint: 'A permanent address is where an animal:',
      bullets: [
        'will permanently reside',
        'can be checked by the Animal and Plant Health Agency (APHA)'
      ],
      hiddenSuffix: PERMANENT_ADDRESS_TITLE.toLowerCase(),
      addLink: {
        href: pagePath(
          result.journeyId,
          PERMANENT_ADDRESS_PATH_RETURNING_TO_ADDRESSES
        ),
        text: 'Add a permanent address'
      }
    })
  })

  it('Should show the one saved address, with its inset lines and a Change link, for a single hand-entered animal', async () => {
    const { commodityLines } = petConsignmentSeed({
      row: FELIS_CATUS_ROW,
      units: [
        {
          animalIdentifierMicrochip: CAT_1_MICROCHIP,
          permanentAddressOrigin: 'newAddress',
          permanentAddress: {
            name: 'Pet Owner',
            phone: '0113 555 0192',
            email: 'pet@example.co.uk',
            address: {
              addressLine1: '1 Pet Lane',
              townOrCity: 'Leeds',
              postcode: 'LS1 1AA',
              countryCode: 'GB'
            }
          }
        }
      ]
    })
    const result = await driveAddresses({ commodityLines })

    expect(
      sectionTitled(sectionsOf(result), PERMANENT_ADDRESS_TITLE).chosen
    ).toEqual({
      name: 'Pet Owner',
      lines: ['1 Pet Lane', 'Leeds, LS1 1AA, United Kingdom'],
      changeHref: pagePath(
        result.journeyId,
        PERMANENT_ADDRESS_PATH_RETURNING_TO_ADDRESSES
      )
    })
  })

  it('Should show that one address once, not a count line, when two animals are both saved against the place of destination', async () => {
    const placeOfDestinationAddress = {
      name: 'Tech Imports Ltd',
      phone: '01632 960000',
      email: 'tech-imports-ltd@example.com',
      address: {
        addressLine1: '18 Dockside Road',
        townOrCity: 'London',
        postcode: 'E14 9GE',
        countryCode: 'GB'
      }
    }
    const { commodityLines } = petConsignmentSeed({
      row: FELIS_CATUS_ROW,
      units: [
        {
          animalIdentifierMicrochip: CAT_1_MICROCHIP,
          permanentAddressOrigin: 'placeOfDestination',
          permanentAddress: placeOfDestinationAddress
        },
        {
          animalIdentifierMicrochip: CAT_2_MICROCHIP,
          permanentAddressOrigin: 'placeOfDestination',
          permanentAddress: placeOfDestinationAddress
        }
      ]
    })
    const result = await driveAddresses({ commodityLines })

    expect(
      sectionTitled(sectionsOf(result), PERMANENT_ADDRESS_TITLE).chosen
    ).toEqual({
      name: 'Tech Imports Ltd',
      lines: ['18 Dockside Road', 'London, E14 9GE, United Kingdom'],
      changeHref: pagePath(
        result.journeyId,
        PERMANENT_ADDRESS_PATH_RETURNING_TO_ADDRESSES
      )
    })
  })

  it('Should show the count line, not an address, when two animals hold different hand-entered addresses', async () => {
    const { commodityLines } = petConsignmentSeed({
      row: FELIS_CATUS_ROW,
      units: [
        {
          animalIdentifierMicrochip: CAT_1_MICROCHIP,
          permanentAddressOrigin: 'newAddress',
          permanentAddress: { name: 'Pet Owner One' }
        },
        {
          animalIdentifierMicrochip: CAT_2_MICROCHIP,
          permanentAddressOrigin: 'newAddress',
          permanentAddress: { name: 'Pet Owner Two' }
        }
      ]
    })
    const result = await driveAddresses({ commodityLines })

    expect(
      sectionTitled(sectionsOf(result), PERMANENT_ADDRESS_TITLE).chosen
    ).toEqual({
      lines: ['Permanent addresses added for 2 animals'],
      changeHref: pagePath(
        result.journeyId,
        PERMANENT_ADDRESS_PATH_RETURNING_TO_ADDRESSES
      )
    })
  })

  it('Should keep offering the add link, with no chosen content, while one of two animals has no saved address', async () => {
    const { commodityLines } = petConsignmentSeed({
      row: FELIS_CATUS_ROW,
      units: [
        {
          animalIdentifierMicrochip: CAT_1_MICROCHIP,
          permanentAddressOrigin: 'newAddress',
          permanentAddress: { name: 'Pet Owner One' }
        },
        { animalIdentifierMicrochip: CAT_2_MICROCHIP }
      ]
    })
    const result = await driveAddresses({ commodityLines })
    const section = sectionTitled(sectionsOf(result), PERMANENT_ADDRESS_TITLE)

    expect(section.chosen).toBeUndefined()
    expect(section.addLink).toEqual({
      href: pagePath(
        result.journeyId,
        PERMANENT_ADDRESS_PATH_RETURNING_TO_ADDRESSES
      ),
      text: 'Add a permanent address'
    })
  })
})

describe('GET addresses — conditional CPH section', () => {
  useStubbedJourney(SET_ID, dispatchPages)

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
    ],
    ['opened with no trail, as an address book return leaves it', [], []]
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
