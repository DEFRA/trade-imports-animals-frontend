import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { buildDispatch } from '../../../../../../flow/dispatch.js'
import { commodityCodeFor } from '../../../../services/commodities/index.js'
import { store } from '../../../../../../engine/store.js'
import {
  AMEND,
  configureRecords,
  DRAFT,
  records,
  SUBMITTED
} from '../../../../../../engine/persistence/records.js'
import { configureSession } from '../../../../../../engine/persistence/session.js'
import { records as recordsStub } from '../../../../../../services/persistence/records/stub/index.js'
import { session as sessionStub } from '../../../../../../services/persistence/session/stub.js'
import {
  driveHandler,
  journeyRequest,
  stubH
} from '../../../../../../engine/test-support.js'
import { configureAnswersForRead } from '../../../../../../engine/read.js'
import { withoutUnresolvedPartyRefs } from '../addresses/resolve-parties.js'
import { taskRows } from '../../flow/task-rows.js'
import { dispatchPages } from '../index.js'
import { routes } from './controller.js'
import { buildSections } from './view-model/index.js'
import { REVIEW_CARDS } from './view-model/incomplete-cards.js'
import { copy as copyEn } from './copy/copy.en.js'

const getHandler = routes.find((route) => route.method === 'GET').handler
const postHandler = routes.find((route) => route.method === 'POST').handler

const sectionsFor = async (seed) =>
  (await driveHandler(getHandler, { seed })).view.context.sections

const summaryFor = async (seed) =>
  (await driveHandler(getHandler, { seed })).view.context.errorSummary

const viewForStatus = async (status, seed = fullSeed, query = {}) => {
  const journey = await store.create()
  await store.seedAnswers(journey.journeyId, seed)
  if (status === SUBMITTED || status === AMEND) {
    await store.submit(journey.journeyId)
  }
  if (status === AMEND) {
    await records.amend(journey.journeyId)
  }
  const h = stubH()
  await getHandler(journeyRequest(journey.journeyId, { query }), h)
  return h.captured.view
}

const cardsOf = (sections) =>
  sections.flatMap((section) => section.groups.flatMap((group) => group.cards))

const cardByTitle = (sections, title) =>
  cardsOf(sections).find((card) => card.title === title)

const rowsOf = (sections) =>
  cardsOf(sections).flatMap((card) => [
    ...(card.rows ?? []),
    ...(card.documents ?? []).flatMap((document) => document.rows)
  ])

const rowByKey = (rows, key) => rows.find((row) => row.key.text === key)
const valueOf = (rows, key) => rowByKey(rows, key)?.value.text
const htmlOf = (rows, key) => rowByKey(rows, key)?.value.html
const keysOf = (rows) => rows.map((row) => row.key.text)
const cardChangeHrefOf = (sections, title) =>
  cardByTitle(sections, title)?.actions?.items[0].href
const changeHrefsOf = (sections) =>
  cardsOf(sections).flatMap((card) => [
    ...(card.actions?.items ?? []).map((action) => action.href),
    ...(card.rows ?? []).flatMap((entry) =>
      (entry.actions?.items ?? []).map((action) => action.href)
    )
  ])
const rowActionsOf = (sections) =>
  rowsOf(sections).flatMap((entry) => entry.actions?.items ?? [])

// The two treatments an empty value gets. A card that is finished writes the
// blank out; a card that still has answers outstanding gives it no text at all
// and marks the cell instead, so the eye can separate the two.
const NOT_APPLICABLE = 'Not applicable'
const MISSING_HTML =
  '<span class="app-summary-list__value--missing">' +
  '<span class="govuk-visually-hidden">Missing</span>' +
  '</span>'
const CONSIGNOR_ERROR = 'Select an address for the consignor'
const IMPORT_DETAILS_INCOMPLETE = 'Complete import details'
const ADDRESSES_INCOMPLETE = 'Complete roles and addresses'
const SPECIES_INCOMPLETE = 'Complete species details'
const DOCUMENTS_INCOMPLETE = 'Complete documents'

const withoutParty = (seed, partyId) => {
  const next = { ...seed }
  delete next[partyId]
  return next
}
const ADDRESS_LINE_1 = '43 East Hague Extension'
const CONSIGNOR_NAME = 'Astra Rosales'
const CONSIGNOR_ADDRESS_ID = 'astra-rosales'
const COW_CARD_TITLE = 'Cow (0102) — Bos taurus'
const IMPORT_DETAILS_CARD = 'Import details'
const REASON_FOR_IMPORT_CARD = 'Reason for import'
const ADDITIONAL_ANIMAL_DETAILS_CARD = 'Additional animal details'
const ARRIVAL_DETAILS_CARD = 'Arrival details'
const TRANSIT_COUNTRIES_CARD = 'Transit countries'
const TRANSPORT_DETAILS_CARD = 'Transport details'
const ROLES_AND_ADDRESSES_CARD = 'Roles and addresses'
const CONTACT_ADDRESS_CARD = 'Contact address for this consignment'
const UPLOADED_DOCUMENTS_CARD = 'Uploaded documents'
const TRANSPORT_AND_ARRIVAL_ANCHOR = 'transport-and-arrival'
const COUNTRY_OF_ORIGIN_KEY = 'Country of origin'
const PURPOSE_IN_MARKET_KEY = 'Purpose in the market'
const REGION_CODE_KEY = 'Region of origin code'
const INTERNAL_REFERENCE_KEY = 'Internal reference number'
const UNWEANED_KEY = 'Includes unweaned animals'
const CPH_KEY = 'County parish holding (CPH) number'
const TRANSITED_COUNTRIES_KEY =
  'Countries that the consignment will travel through'
const PACKAGES_KEY = 'Number of packages'
const DOCUMENT_TYPE_KEY = 'Document type'
const DESTINATION_COUNTRY_KEY = 'Destination country'
const EXIT_DATE_KEY = 'Exit date'
const PORT_OF_EXIT_KEY = 'Port of exit'

const fullSeed = {
  countryOfOrigin: 'FR',
  regionOfOriginCodeRequirement: 'yes',
  regionOfOriginCode: 'FR-75',
  internalReferenceNumber: 'Imports456GB',
  commodityLines: [
    {
      commoditySelection: 'Cow',
      speciesSelection: '1148346',
      commodityType: '16',
      numberOfAnimalsQuantity: '25',
      numberOfPackages: '5',
      animalIdentifiers: [
        {
          animalIdentifierEarTag: 'UK1',
          animalIdentifierPassport: 'UK123456789',
          permanentAddress: { name: 'Pet Owner' }
        }
      ]
    }
  ],
  reasonForImport: 'internalMarket',
  purposeInInternalMarket: 'breeding',
  animalsCertifiedFor: 'slaughter',
  containsUnweanedAnimals: 'no',
  documents: [
    {
      accompanyingDocumentType: 'VETERINARY_HEALTH_CERTIFICATE',
      accompanyingDocumentAttachmentType: 'PDF',
      accompanyingDocumentReference: 'GBHC1234567890',
      accompanyingDocumentDateOfIssue: { day: '12', month: '12', year: '2025' }
    }
  ],
  placeOfOrigin: { addressId: 'origin-farm' },
  consignor: { addressId: CONSIGNOR_ADDRESS_ID },
  consignee: { addressId: 'british-livestock-ltd' },
  importer: { addressId: 'import-co-uk' },
  placeOfDestination: { addressId: 'tech-imports-ltd' },
  countyParishHoldingCph: '123456789',
  portOfEntry: 'GB ABD',
  arrivalDateAtPort: { day: '12', month: '12', year: '2026' },
  meansOfTransport: 'ROAD_VEHICLE',
  transportIdentification: 'FR-892-LK',
  transportDocumentReference: 'CMR-2026-884721',
  transitedCountries: ['FR', 'BE'],
  transporterType: 'Commercial',
  commercialTransporter: {
    name: 'García Livestock Transport SL',
    approvalNumber: 'ES-T2-45001294',
    address: {
      addressLine1: ADDRESS_LINE_1,
      country: 'Switzerland'
    }
  },
  contactAddress: { addressId: 'animal-and-plant-health-agency' }
}

const SUITE = `#${buildSections.name} (check-answers GET)`

const setupCheckAnswersEngine = () => {
  beforeAll(() => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    buildDispatch(dispatchPages)
  })
  beforeEach(() => store.clear())
}

describe(`${SUITE} — journey lifecycle editability`, () => {
  setupCheckAnswersEngine()

  it('Should omit every Change href for a submitted journey', async () => {
    const view = await viewForStatus(SUBMITTED)

    expect(view.context.readOnly).toBe(true)
    expect(changeHrefsOf(view.context.sections)).toEqual([])
    expect(view.context.cancelAmendHref).toBeNull()
    expect(view.context.copyAction).toEqual({
      href: expect.stringMatching(/\/copy$/)
    })
    expect(view.context.deleteHref).toMatch(/\/delete$/)
  })

  it.each([DRAFT, AMEND])(
    'Should retain Change hrefs for an editable %s journey',
    async (status) => {
      const view = await viewForStatus(status)
      const hrefs = changeHrefsOf(view.context.sections)

      expect(view.context.readOnly).toBe(false)
      expect(view.context.copyAction).toBeNull()
      expect(view.context.deleteHref).toBeNull()
      expect(hrefs).not.toHaveLength(0)
      expect(hrefs).toEqual(
        expect.arrayContaining([expect.stringMatching(/\/origin\?change=1$/)])
      )
    }
  )

  // A submitted journey has no Change links at all, so an empty documents card
  // would otherwise stand with nothing inside it.
  it('Should keep the documents card readable on a submitted journey with nothing uploaded', async () => {
    const seed = { ...fullSeed }
    delete seed.documents
    const view = await viewForStatus(SUBMITTED, seed)
    const card = cardByTitle(view.context.sections, UPLOADED_DOCUMENTS_CARD)

    expect(card.actions).toBeUndefined()
    expect(card.emptyText).toBe('You have not added any documents yet.')
  })

  it('Should expose Cancel amendment only on an amending CYA', async () => {
    const draft = await viewForStatus(DRAFT)
    const submitted = await viewForStatus(SUBMITTED)
    const amend = await viewForStatus(AMEND)

    expect(draft.context.cancelAmendHref).toBeNull()
    expect(submitted.context.cancelAmendHref).toBeNull()
    expect(amend.context.cancelAmendHref).toMatch(/\/cancel-amend$/)
  })

  it('Should show the cancel success indication only on the restored submitted view', async () => {
    const submitted = await viewForStatus(SUBMITTED, fullSeed, {
      cancelled: '1'
    })
    const draft = await viewForStatus(DRAFT, fullSeed, { cancelled: '1' })

    expect(submitted.context.amendmentCancelled).toBe(true)
    expect(draft.context.amendmentCancelled).toBe(false)
  })
})

// Design release 1 lays the review out as six numbered sections mirroring the
// task list, with a subsection heading above every card. The numbers are part
// of the heading copy, so the order here and the numbering there have to agree.
describe(`${SUITE} — section and subsection headings`, () => {
  setupCheckAnswersEngine()

  it('Should render the numbered design sections in order', async () => {
    const sections = await sectionsFor(fullSeed)
    expect(sections.map((section) => section.heading)).toEqual([
      '1. About the consignment',
      '2. Description of the goods',
      '3. Transport and arrival',
      '4. Documents',
      '5. Consignment parties',
      '6. Contact address'
    ])
  })

  // No group reaches the template without a heading — a null one would silently
  // drop its cards straight under the numbered heading, which is what design
  // release 1 does not do.
  it('Should head every group with a subsection heading', async () => {
    const groups = (await sectionsFor(fullSeed)).flatMap(
      (section) => section.groups
    )

    expect(groups.length).toBeGreaterThan(0)
    for (const group of groups) {
      expect(typeof group.heading, JSON.stringify(group.heading)).toBe('string')
    }
  })

  it('Should name the subsection headings design release 1 gives each card', async () => {
    const sections = await sectionsFor(fullSeed)

    expect(
      sections.flatMap((section) =>
        section.groups.map((group) => group.heading)
      )
    ).toEqual([
      'Where is this consignment coming from?',
      'Main reason for import',
      'Commodity details',
      'Additional details',
      ARRIVAL_DETAILS_CARD,
      TRANSIT_COUNTRIES_CARD,
      TRANSPORT_DETAILS_CARD,
      'Upload documents',
      ROLES_AND_ADDRESSES_CARD,
      CONTACT_ADDRESS_CARD
    ])
  })

  // Which numbered section a subsection sits under is the whole substance of
  // design release 1's grouping, and a flattened list cannot see it move.
  it('Should place each subsection under the numbered section that owns it', async () => {
    const sections = await sectionsFor(fullSeed)

    expect(
      sections.map((section) => [
        section.anchor,
        section.groups.map((group) => group.heading)
      ])
    ).toEqual([
      [
        'about-the-consignment',
        ['Where is this consignment coming from?', 'Main reason for import']
      ],
      ['description-of-the-goods', ['Commodity details', 'Additional details']],
      [
        TRANSPORT_AND_ARRIVAL_ANCHOR,
        [ARRIVAL_DETAILS_CARD, TRANSIT_COUNTRIES_CARD, TRANSPORT_DETAILS_CARD]
      ],
      ['documents-section', ['Upload documents']],
      ['consignment-parties', [ROLES_AND_ADDRESSES_CARD]],
      ['contact-address-section', [CONTACT_ADDRESS_CARD]]
    ])
  })
})

describe(`${SUITE} — fully-populated notification`, () => {
  setupCheckAnswersEngine()

  it('Should resolve service-backed labels for coded answers', async () => {
    const rows = rowsOf(await sectionsFor(fullSeed))
    expect(valueOf(rows, COUNTRY_OF_ORIGIN_KEY)).toBe('France')
    expect(valueOf(rows, 'Reason for import')).toBe('Internal market')
    expect(valueOf(rows, PURPOSE_IN_MARKET_KEY)).toBe('Breeding')
    expect(valueOf(rows, 'Certified for')).toBe('Slaughter')
  })

  it('Should map yes/no coded answers to Yes/No labels', async () => {
    const rows = rowsOf(await sectionsFor(fullSeed))
    expect(valueOf(rows, 'Region of origin code required')).toBe('Yes')
    expect(valueOf(rows, UNWEANED_KEY)).toBe('No')
  })

  it('Should map the means-of-transport enum to its display label', async () => {
    const rows = rowsOf(await sectionsFor(fullSeed))
    expect(valueOf(rows, 'Means of transport to the port of entry')).toBe(
      'Road Vehicle'
    )
  })

  it('Should include the region-of-origin-code row when the requirement is yes', async () => {
    const rows = rowsOf(await sectionsFor(fullSeed))
    expect(valueOf(rows, REGION_CODE_KEY)).toBe('FR-75')
  })

  it('Should include the unweaned row when a line is an unweaned-eligible commodity', async () => {
    expect(keysOf(rowsOf(await sectionsFor(fullSeed)))).toContain(UNWEANED_KEY)
  })

  it('Should include the CPH row in the roles-and-addresses card when a line is a CPH-eligible commodity', async () => {
    const card = cardByTitle(
      await sectionsFor(fullSeed),
      ROLES_AND_ADDRESSES_CARD
    )
    expect(valueOf(card.rows, CPH_KEY)).toBe('123456789')
  })

  it('Should include the transited-countries row for an overland means of transport, labelling each code', async () => {
    const rows = rowsOf(await sectionsFor(fullSeed))
    expect(valueOf(rows, TRANSITED_COUNTRIES_KEY)).toBe('France, Belgium')
  })

  it('Should expand the commercial transporter in the transport-details card when the type is commercial', async () => {
    const card = cardByTitle(
      await sectionsFor(fullSeed),
      TRANSPORT_DETAILS_CARD
    )
    expect(valueOf(card.rows, 'Name')).toBe('García Livestock Transport SL')
    expect(htmlOf(card.rows, 'Address')).toBe(ADDRESS_LINE_1)
    expect(valueOf(card.rows, 'Country')).toBe('Switzerland')
    expect(valueOf(card.rows, 'Approval number')).toBe('ES-T2-45001294')
    expect(valueOf(card.rows, 'Type')).toBe('Commercial')
  })

  it('Should render one species card per commodity line with the design rows', async () => {
    const card = cardByTitle(await sectionsFor(fullSeed), COW_CARD_TITLE)
    expect(valueOf(card.rows, 'Commodity code')).toBe('0102')
    expect(valueOf(card.rows, 'Common name')).toBe('Cow')
    expect(valueOf(card.rows, 'Species')).toBe('Bos taurus')
    expect(valueOf(card.rows, 'Number of animals')).toBe('25')
    expect(valueOf(card.rows, PACKAGES_KEY)).toBe('5')
  })

  it('Should render a read-only identifier table inside the species card', async () => {
    const card = cardByTitle(await sectionsFor(fullSeed), COW_CARD_TITLE)
    expect(card.identifierTable.head.map((cell) => cell.text)).toEqual([
      'Animal',
      'Ear tag',
      'Passport'
    ])
    expect(card.identifierTable.rows).toEqual([
      [{ text: 'Animal 1' }, { text: 'UK1' }, { text: 'UK123456789' }]
    ])
  })

  it('Should render a document group with the design rows inside the uploaded-documents card', async () => {
    const card = cardByTitle(
      await sectionsFor(fullSeed),
      UPLOADED_DOCUMENTS_CARD
    )
    expect(card.documents).toHaveLength(1)
    expect(card.emptyText).toBeNull()
    const [document] = card.documents
    expect(document.heading).toBe('Document 1')
    expect(valueOf(document.rows, 'Document reference')).toBe('GBHC1234567890')
    expect(valueOf(document.rows, DOCUMENT_TYPE_KEY)).toBe(
      'Veterinary health certificate'
    )
    expect(valueOf(document.rows, 'Date of issue')).toBe('12/12/2025')
    expect(valueOf(document.rows, 'Attachment type')).toBe('PDF')
  })

  it('Should name an ITAHC document with the same label the documents page uses', async () => {
    const seed = {
      ...fullSeed,
      documents: [
        { ...fullSeed.documents[0], accompanyingDocumentType: 'ITAHC' }
      ]
    }
    const card = cardByTitle(await sectionsFor(seed), UPLOADED_DOCUMENTS_CARD)
    const [document] = card.documents
    expect(valueOf(document.rows, DOCUMENT_TYPE_KEY)).toBe(
      'Intra Trade Animal Health Certificate (ITAHC)'
    )
  })

  it('Should format the arrival date as day/month/year', async () => {
    expect(
      valueOf(
        rowsOf(await sectionsFor(fullSeed)),
        'Arrival date at port of entry'
      )
    ).toBe('12/12/2026')
  })

  it('Should expand party rows to the stored name plus address lines', async () => {
    const card = cardByTitle(
      await sectionsFor(fullSeed),
      ROLES_AND_ADDRESSES_CARD
    )
    expect(htmlOf(card.rows, 'Consignor')).toBe(
      `<strong>${CONSIGNOR_NAME}</strong><br>${ADDRESS_LINE_1}<br>Bern<br>30055<br>Switzerland`
    )
    expect(htmlOf(card.rows, 'Place of destination')).toBe(
      '<strong>Tech Imports Ltd</strong><br>18 Dockside Road<br>London<br>E14 9GE<br>United Kingdom'
    )
    const contact = cardByTitle(
      await sectionsFor(fullSeed),
      'Contact address for this consignment'
    )
    expect(htmlOf(contact.rows, 'Address')).toBe(
      '<strong>Animal and Plant Health Agency</strong><br>Woodham Lane<br>Addlestone<br>KT15 3NB<br>United Kingdom'
    )
  })

  // Design release 1 puts the Change links in each card's heading and none on a
  // row, so the page offers links per card rather than one per answer. Exactly
  // one per card: a conditional second page gets its own headed card with its
  // own link, rather than a second link on the card beside it.
  it('Should give every card a Change action in its heading and no row any action', async () => {
    const sections = await sectionsFor(fullSeed)

    for (const card of cardsOf(sections)) {
      expect(card.actions.items, card.title).toHaveLength(1)
    }
    expect(rowActionsOf(sections)).toEqual([])
  })

  it('Should point each card Change link at the page that collects its answers with a change flag', async () => {
    const sections = await sectionsFor(fullSeed)

    expect(cardChangeHrefOf(sections, IMPORT_DETAILS_CARD)).toMatch(
      /\/origin\?change=1$/
    )
    expect(cardChangeHrefOf(sections, ADDITIONAL_ANIMAL_DETAILS_CARD)).toMatch(
      /\/additional-details\?change=1$/
    )
    expect(cardChangeHrefOf(sections, ARRIVAL_DETAILS_CARD)).toMatch(
      /\/port-of-entry\?change=1$/
    )
    expect(cardChangeHrefOf(sections, TRANSPORT_DETAILS_CARD)).toMatch(
      /\/transporters\?change=1$/
    )
    expect(cardChangeHrefOf(sections, ROLES_AND_ADDRESSES_CARD)).toMatch(
      /\/addresses\?change=1$/
    )
    expect(cardChangeHrefOf(sections, CONTACT_ADDRESS_CARD)).toMatch(
      /\/consignment\/contact\/select\?change=1$/
    )
  })

  it('Should name the card, not the row, in each Change link visually hidden text', async () => {
    const sections = await sectionsFor(fullSeed)
    const hiddenTextOf = (title) =>
      cardByTitle(sections, title).actions.items[0].visuallyHiddenText

    expect(hiddenTextOf(IMPORT_DETAILS_CARD)).toBe('import details')
    expect(hiddenTextOf(TRANSPORT_DETAILS_CARD)).toBe('transport details')
    expect(hiddenTextOf(COW_CARD_TITLE)).toBe('commodity 1')
  })

  it('Should point the species-card Change action at the consignment-details page with a change flag', async () => {
    const card = cardByTitle(await sectionsFor(fullSeed), COW_CARD_TITLE)
    expect(card.actions.items).toHaveLength(1)
    expect(card.actions.items[0].href).toMatch(
      /\/consignment-details\?change=1$/
    )
  })

  it('Should point the uploaded-documents card Change action at the documents page with a change flag', async () => {
    const card = cardByTitle(
      await sectionsFor(fullSeed),
      UPLOADED_DOCUMENTS_CARD
    )
    expect(card.actions.items[0].href).toMatch(
      /\/accompanying-documents\?change=1$/
    )
  })
})

// Design release 1 gives the countries a consignment travels through their own
// headed card rather than a row inside arrival details. They are collected on
// their own page and asked for only on an overland arrival, so the card stands
// exactly while the answer is in scope and carries the link to that page.
describe(`${SUITE} — transit countries`, () => {
  setupCheckAnswersEngine()

  it('Should build the transit-countries card under its own heading when transited countries apply', async () => {
    const sections = await sectionsFor(fullSeed)
    const transport = sections.find(
      (section) => section.anchor === TRANSPORT_AND_ARRIVAL_ANCHOR
    )

    expect(transport.groups.map((group) => group.heading)).toEqual([
      ARRIVAL_DETAILS_CARD,
      TRANSIT_COUNTRIES_CARD,
      TRANSPORT_DETAILS_CARD
    ])
    expect(
      valueOf(
        cardByTitle(sections, TRANSIT_COUNTRIES_CARD).rows,
        TRANSITED_COUNTRIES_KEY
      )
    ).toBe('France, Belgium')
  })

  it('Should give the transit-countries card its own Change link to the page that collects it', async () => {
    const items = cardByTitle(
      await sectionsFor(fullSeed),
      TRANSIT_COUNTRIES_CARD
    ).actions.items

    expect(items).toHaveLength(1)
    expect(items[0].href).toMatch(/\/transit-countries\?change=1$/)
    expect(items[0].visuallyHiddenText).toBe(
      copyEn.hidden.cards.transitCountries
    )
  })

  it('Should leave the arrival-details card one Change link and no transited-countries row', async () => {
    const card = cardByTitle(await sectionsFor(fullSeed), ARRIVAL_DETAILS_CARD)

    expect(card.actions.items).toHaveLength(1)
    expect(card.actions.items[0].href).toMatch(/\/port-of-entry\?change=1$/)
    expect(keysOf(card.rows)).not.toContain(TRANSITED_COUNTRIES_KEY)
  })

  it('Should drop the transit-countries card and its heading when transited countries do not apply', async () => {
    const sections = await sectionsFor({
      ...fullSeed,
      meansOfTransport: 'AIRPLANE'
    })
    const transport = sections.find(
      (section) => section.anchor === TRANSPORT_AND_ARRIVAL_ANCHOR
    )

    expect(transport.groups.map((group) => group.heading)).toEqual([
      ARRIVAL_DETAILS_CARD,
      TRANSPORT_DETAILS_CARD
    ])
    expect(keysOf(rowsOf(sections))).not.toContain(TRANSITED_COUNTRIES_KEY)
  })
})

// Design release 1 gives the reason for import a card of its own rather than
// folding it in among the animal details, and every row on it comes from the
// reason-for-import page — so unlike the card that used to hold them, this one
// can offer a Change link that reaches them all.
describe(`${SUITE} — reason-for-import card`, () => {
  setupCheckAnswersEngine()

  it('Should carry the reason and the purpose, and link to the page that collects them', async () => {
    const card = cardByTitle(
      await sectionsFor(fullSeed),
      REASON_FOR_IMPORT_CARD
    )

    expect(valueOf(card.rows, copyEn.rows.reasonForImport)).toBe(
      'Internal market'
    )
    expect(valueOf(card.rows, PURPOSE_IN_MARKET_KEY)).toBe('Breeding')
    expect(card.actions.items).toHaveLength(1)
    expect(card.actions.items[0].href).toMatch(/\/import-reason\?change=1$/)
  })

  it('Should leave the additional-animal-details card only the answers its own page collects', async () => {
    const card = cardByTitle(
      await sectionsFor(fullSeed),
      ADDITIONAL_ANIMAL_DETAILS_CARD
    )

    expect(keysOf(card.rows)).toEqual([copyEn.rows.certifiedFor, UNWEANED_KEY])
  })
})

describe(`${SUITE} — gated-off answers and blanks`, () => {
  setupCheckAnswersEngine()

  const gatedOffSeed = {
    regionOfOriginCodeRequirement: 'no',
    reasonForImport: 'transit',
    commodityLines: [{ commoditySelection: 'Fish' }],
    meansOfTransport: 'AIRPLANE',
    transporterType: 'Private',
    privateTransporter: { name: 'Jean Dupont' }
  }

  it('Should keep the region-of-origin-code row when the requirement is no', async () => {
    expect(keysOf(rowsOf(await sectionsFor(gatedOffSeed)))).toContain(
      REGION_CODE_KEY
    )
  })

  it('Should retain a stored region-of-origin code across a requirement flip to no', async () => {
    const rows = rowsOf(
      await sectionsFor({ ...gatedOffSeed, regionOfOriginCode: 'FR-75' })
    )
    expect(valueOf(rows, REGION_CODE_KEY)).toBe('FR-75')
  })

  it('Should omit the internal-market purpose row when the reason is not internalMarket', async () => {
    expect(keysOf(rowsOf(await sectionsFor(gatedOffSeed)))).not.toContain(
      PURPOSE_IN_MARKET_KEY
    )
  })

  it('Should omit the unweaned and CPH rows when no line is an eligible commodity', async () => {
    const keys = keysOf(rowsOf(await sectionsFor(gatedOffSeed)))
    expect(keys).not.toContain(UNWEANED_KEY)
    expect(keys).not.toContain(CPH_KEY)
  })

  it('Should omit the packages row when the commodity is off the package-count list', async () => {
    const card = cardByTitle(await sectionsFor(gatedOffSeed), 'Fish (0301)')
    expect(keysOf(card.rows)).not.toContain(PACKAGES_KEY)
  })

  it('Should omit the transited-countries row for a non-overland means of transport', async () => {
    expect(keysOf(rowsOf(await sectionsFor(gatedOffSeed)))).not.toContain(
      TRANSITED_COUNTRIES_KEY
    )
  })

  it('Should expand the private transporter and omit the approval-number row when the type is private', async () => {
    const card = cardByTitle(
      await sectionsFor(gatedOffSeed),
      TRANSPORT_DETAILS_CARD
    )
    expect(valueOf(card.rows, 'Name')).toBe('Jean Dupont')
    expect(valueOf(card.rows, 'Type')).toBe('Private')
    expect(keysOf(card.rows)).not.toContain('Approval number')
  })

  it('Should omit the identifier table when the commodity holds no entry', async () => {
    const sections = await sectionsFor(gatedOffSeed)
    expect(cardByTitle(sections, 'Fish (0301)').identifierTable).toBeNull()
  })

  // Documents are optional, so an empty collection is the ordinary case. The
  // section and its card stand anyway, or the review never mentions documents
  // and the trader has no route to the upload page from it.
  it('Should keep the documents section and its card when nothing has been uploaded', async () => {
    const sections = await sectionsFor(gatedOffSeed)
    expect(sections.map((section) => section.heading)).toContain('4. Documents')
    const card = cardByTitle(sections, UPLOADED_DOCUMENTS_CARD)
    expect(card.documents).toEqual([])
    expect(card.emptyText).toBe('You have not added any documents yet.')
  })

  it('Should still offer the Change route to the documents page when nothing has been uploaded', async () => {
    const card = cardByTitle(
      await sectionsFor(gatedOffSeed),
      UPLOADED_DOCUMENTS_CARD
    )
    expect(card.actions.items[0].href).toMatch(
      /\/accompanying-documents\?change=1$/
    )
  })

  // Every card on this seed still has answers outstanding, so every blank row
  // in it is marked missing rather than written out.
  it('Should mark a blank plain answer missing', async () => {
    const rows = rowsOf(await sectionsFor(gatedOffSeed))
    expect(htmlOf(rows, INTERNAL_REFERENCE_KEY)).toBe(MISSING_HTML)
    expect(htmlOf(rows, 'Port of entry')).toBe(MISSING_HTML)
  })

  it('Should mark a coded answer with no matching label missing', async () => {
    expect(
      htmlOf(rowsOf(await sectionsFor(gatedOffSeed)), COUNTRY_OF_ORIGIN_KEY)
    ).toBe(MISSING_HTML)
  })

  it('Should mark a blank date missing', async () => {
    expect(
      htmlOf(
        rowsOf(await sectionsFor(gatedOffSeed)),
        'Arrival date at port of entry'
      )
    ).toBe(MISSING_HTML)
  })

  it('Should mark an unset party missing', async () => {
    const card = cardByTitle(
      await sectionsFor(gatedOffSeed),
      ROLES_AND_ADDRESSES_CARD
    )
    expect(htmlOf(card.rows, 'Place of origin')).toBe(MISSING_HTML)
  })
})

// Design release 1 writes an empty value out as "Not applicable" while the card
// around it is finished, and gives it no text at all while the card still has
// answers outstanding. The decision is per card, not per row: an optional blank
// inside an unfinished card is marked missing along with the rest.
describe(`${SUITE} — empty values on a finished and an unfinished card`, () => {
  setupCheckAnswersEngine()

  const without = (seed, ...keys) => {
    const next = { ...seed }
    for (const key of keys) {
      delete next[key]
    }
    return next
  }
  const withoutInternalReference = () =>
    without(fullSeed, 'internalReferenceNumber')

  it('Should write an unanswered optional row out as Not applicable on a finished card', async () => {
    const sections = await sectionsFor(withoutInternalReference())
    const card = cardByTitle(sections, IMPORT_DETAILS_CARD)

    expect(card.error).toBeNull()
    expect(valueOf(card.rows, INTERNAL_REFERENCE_KEY)).toBe(NOT_APPLICABLE)
  })

  it('Should give the same optional row no text at all on an unfinished card', async () => {
    const sections = await sectionsFor(
      without(fullSeed, 'internalReferenceNumber', 'countryOfOrigin')
    )
    const card = cardByTitle(sections, IMPORT_DETAILS_CARD)
    const reference = rowByKey(card.rows, INTERNAL_REFERENCE_KEY)

    expect(card.error).toBe(IMPORT_DETAILS_INCOMPLETE)
    expect(reference.value.text).toBeUndefined()
    expect(reference.value.html).toBe(MISSING_HTML)
  })

  it('Should leave an answered row alone inside an unfinished card', async () => {
    const sections = await sectionsFor(without(fullSeed, 'countryOfOrigin'))
    const card = cardByTitle(sections, IMPORT_DETAILS_CARD)

    expect(card.error).toBe(IMPORT_DETAILS_INCOMPLETE)
    expect(valueOf(card.rows, INTERNAL_REFERENCE_KEY)).toBe('Imports456GB')
  })

  // The placeholder is a rendered string, not a signal. A trader who types it
  // into a free-text answer has given an answer, and an unfinished card must
  // not swallow it.
  it('Should keep a typed answer that reads Not applicable on an unfinished card', async () => {
    const sections = await sectionsFor({
      ...without(fullSeed, 'countryOfOrigin'),
      internalReferenceNumber: NOT_APPLICABLE
    })
    const card = cardByTitle(sections, IMPORT_DETAILS_CARD)
    const reference = rowByKey(card.rows, INTERNAL_REFERENCE_KEY)

    expect(card.error).toBe(IMPORT_DETAILS_INCOMPLETE)
    expect(reference.value.text).toBe(NOT_APPLICABLE)
    expect(reference.value.html).toBeUndefined()
  })

  // The uploaded-documents card is the only card whose rows are nested inside
  // document groups, so it is the only card that exercises the nested half of
  // the blanking pass. A part-filled document leaves the documents task row
  // in progress, which is what marks the card.
  it('Should mark the blank rows inside an unfinished documents card missing', async () => {
    const sections = await sectionsFor({
      ...fullSeed,
      documents: [{ accompanyingDocumentType: 'VETERINARY_HEALTH_CERTIFICATE' }]
    })
    const card = cardByTitle(sections, UPLOADED_DOCUMENTS_CARD)
    const [document] = card.documents

    expect(card.error).toBe(DOCUMENTS_INCOMPLETE)
    expect(htmlOf(document.rows, 'Document reference')).toBe(MISSING_HTML)
    expect(htmlOf(document.rows, 'Date of issue')).toBe(MISSING_HTML)
    expect(htmlOf(document.rows, 'Attachment type')).toBe(MISSING_HTML)
    expect(valueOf(document.rows, DOCUMENT_TYPE_KEY)).toBe(
      'Veterinary health certificate'
    )
  })

  it('Should write every empty value out on a submitted notification', async () => {
    const { context } = await viewForStatus(
      SUBMITTED,
      withoutInternalReference()
    )
    const card = cardByTitle(context.sections, IMPORT_DETAILS_CARD)

    expect(valueOf(card.rows, INTERNAL_REFERENCE_KEY)).toBe(NOT_APPLICABLE)
  })
})

// The reason for import asks up to three further questions — the destination
// country, the exit date and the port of exit. A trader who answered one has
// to be able to read it back and change it from the review.
describe(`${SUITE} — reason-for-import exit answers`, () => {
  setupCheckAnswersEngine()

  const reasonSeed = (answers) => ({
    commodityLines: [{ commoditySelection: 'Fish' }],
    ...answers
  })

  it('Should show the destination country and port of exit for a transit, labelling both codes', async () => {
    const rows = rowsOf(
      await sectionsFor(
        reasonSeed({
          reasonForImport: 'transit',
          destinationCountry: 'IE',
          portOfExit: 'GB DVR'
        })
      )
    )

    expect(valueOf(rows, DESTINATION_COUNTRY_KEY)).toBe('Ireland')
    expect(valueOf(rows, PORT_OF_EXIT_KEY)).toBe('Port of Dover (GB DVR)')
    expect(keysOf(rows)).not.toContain(EXIT_DATE_KEY)
  })

  it('Should show the destination country alone for a transhipment', async () => {
    const rows = rowsOf(
      await sectionsFor(
        reasonSeed({
          reasonForImport: 'transhipmentOrOnwardTravel',
          destinationCountry: 'IE'
        })
      )
    )

    expect(valueOf(rows, DESTINATION_COUNTRY_KEY)).toBe('Ireland')
    expect(keysOf(rows)).not.toContain(EXIT_DATE_KEY)
    expect(keysOf(rows)).not.toContain(PORT_OF_EXIT_KEY)
  })

  it('Should show the exit date and port of exit for a temporary admission of horses', async () => {
    const rows = rowsOf(
      await sectionsFor(
        reasonSeed({
          reasonForImport: 'temporaryAdmissionHorses',
          exitDate: { day: '27', month: '3', year: '2026' },
          portOfExit: 'GB DVR'
        })
      )
    )

    expect(valueOf(rows, EXIT_DATE_KEY)).toBe('27/3/2026')
    expect(valueOf(rows, PORT_OF_EXIT_KEY)).toBe('Port of Dover (GB DVR)')
    expect(keysOf(rows)).not.toContain(DESTINATION_COUNTRY_KEY)
  })

  it('Should omit all three rows for a reason that asks none of them', async () => {
    const keys = keysOf(
      rowsOf(await sectionsFor(reasonSeed({ reasonForImport: 'reEntry' })))
    )

    expect(keys).not.toContain(DESTINATION_COUNTRY_KEY)
    expect(keys).not.toContain(EXIT_DATE_KEY)
    expect(keys).not.toContain(PORT_OF_EXIT_KEY)
  })

  it('Should mark an in-scope exit answer left blank missing', async () => {
    const rows = rowsOf(
      await sectionsFor(
        reasonSeed({ reasonForImport: 'temporaryAdmissionHorses' })
      )
    )

    expect(htmlOf(rows, EXIT_DATE_KEY)).toBe(MISSING_HTML)
    expect(htmlOf(rows, PORT_OF_EXIT_KEY)).toBe(MISSING_HTML)
  })

  // The exit answers sit on the reason-for-import card, the card whose one
  // Change link reaches the page that collects them. That pairing is what makes
  // a card without row links changeable at all, so pin the rows and the link
  // together rather than either on its own.
  it('Should show every exit row on the reason-for-import card, whose one Change link reaches them', async () => {
    const sections = await sectionsFor(
      reasonSeed({
        reasonForImport: 'temporaryAdmissionHorses',
        exitDate: { day: '27', month: '3', year: '2026' },
        portOfExit: 'GB DVR'
      })
    )
    const card = cardByTitle(sections, REASON_FOR_IMPORT_CARD)

    expect(keysOf(card.rows)).toContain(EXIT_DATE_KEY)
    expect(keysOf(card.rows)).toContain(PORT_OF_EXIT_KEY)
    expect(rowActionsOf(sections)).toEqual([])
    expect(cardChangeHrefOf(sections, REASON_FOR_IMPORT_CARD)).toMatch(
      /\/import-reason\?change=1$/
    )
  })
})

describe(`${SUITE} — address-book party references`, () => {
  setupCheckAnswersEngine()

  it('Should render the address book name and address for an addressId reference', async () => {
    const card = cardByTitle(
      await sectionsFor({
        consignor: { addressId: CONSIGNOR_ADDRESS_ID }
      }),
      ROLES_AND_ADDRESSES_CARD
    )

    expect(htmlOf(card.rows, 'Consignor')).toContain(CONSIGNOR_NAME)
    expect(htmlOf(card.rows, 'Consignor')).toContain(ADDRESS_LINE_1)
  })

  it('Should render a message against the role when the referenced address is gone', async () => {
    const card = cardByTitle(
      await sectionsFor({
        consignor: { addressId: 'gone' }
      }),
      ROLES_AND_ADDRESSES_CARD
    )

    expect(htmlOf(card.rows, 'Consignor')).toContain(CONSIGNOR_ERROR)
    expect(htmlOf(card.rows, 'Consignor')).toContain('govuk-error-message')
  })
})

describe(`${SUITE} — submitted inline vs live amend`, () => {
  setupCheckAnswersEngine()

  const FROZEN_CONSIGNOR = 'Frozen Consignor Ltd'

  it('Should render stored inline details on a submitted notification, not the live book name', async () => {
    const { context } = await viewForStatus(SUBMITTED, {
      ...fullSeed,
      consignor: {
        addressId: CONSIGNOR_ADDRESS_ID,
        name: FROZEN_CONSIGNOR,
        address: { addressLine1: 'Old Lane', countryCode: 'GB' }
      }
    })
    const card = cardByTitle(context.sections, ROLES_AND_ADDRESSES_CARD)
    expect(htmlOf(card.rows, 'Consignor')).toContain(FROZEN_CONSIGNOR)
    expect(htmlOf(card.rows, 'Consignor')).not.toContain(CONSIGNOR_NAME)
  })

  it('Should resolve live on an amendment from the address book', async () => {
    const { context } = await viewForStatus(AMEND, {
      ...fullSeed,
      consignor: { addressId: CONSIGNOR_ADDRESS_ID }
    })
    const card = cardByTitle(context.sections, ROLES_AND_ADDRESSES_CARD)
    expect(htmlOf(card.rows, 'Consignor')).toContain(CONSIGNOR_NAME)
    expect(htmlOf(card.rows, 'Consignor')).not.toContain(FROZEN_CONSIGNOR)
  })
})

describe(`${SUITE} — outstanding referenced roles`, () => {
  setupCheckAnswersEngine()

  it('Should list every outstanding role in the error summary', async () => {
    const summary = await summaryFor({
      ...fullSeed,
      consignor: { addressId: 'gone' },
      importer: { addressId: 'gone' }
    })

    expect(summary.errorList.map((entry) => entry.text)).toEqual([
      CONSIGNOR_ERROR,
      'Select an address for the importer'
    ])
  })

  // A role never answered raises no role error — there is nothing broken to
  // name. It leaves its card unfinished, which the card entry says instead.
  it('Should not raise a role error for a role that has never been answered', async () => {
    const summary = await summaryFor(withoutParty(fullSeed, 'importer'))

    expect(summary.errorList.map((entry) => entry.text)).toEqual([
      ADDRESSES_INCOMPLETE
    ])
  })

  it('Should not raise a role error on a brand-new draft', async () => {
    const texts = (await summaryFor({})).errorList.map((entry) => entry.text)

    expect(texts).not.toContain(CONSIGNOR_ERROR)
    expect(texts).toContain(ADDRESSES_INCOMPLETE)
  })

  it('Should mark a role that has never been answered missing', async () => {
    const card = cardByTitle(
      await sectionsFor(withoutParty(fullSeed, 'importer')),
      ROLES_AND_ADDRESSES_CARD
    )
    expect(htmlOf(card.rows, 'Importer')).toBe(MISSING_HTML)
  })

  it('Should link each summary entry where that role is changed', async () => {
    const { view } = await driveHandler(getHandler, {
      seed: { ...fullSeed, consignor: { addressId: 'gone' } }
    })
    const { errorSummary, sections } = view.context
    const card = cardByTitle(sections, ROLES_AND_ADDRESSES_CARD)

    expect(errorSummary.errorList[0].href).toMatch(/\/addresses\?change=1$/)
    expect(errorSummary.errorList[0].href).toBe(card.actions.items[0].href)
  })

  it('Should leave focus where it is when the page is merely visited', async () => {
    const summary = await summaryFor({
      ...fullSeed,
      consignor: { addressId: 'gone' }
    })

    expect(summary.disableAutoFocus).toBe(true)
  })

  it('Should carry no error summary once every referenced role resolves', async () => {
    expect(await summaryFor(fullSeed)).toBeNull()
  })

  it('Should carry no error summary for a reference the address book still holds', async () => {
    const summary = await summaryFor({
      ...fullSeed,
      consignor: { addressId: CONSIGNOR_ADDRESS_ID }
    })

    expect(summary).toBeNull()
  })

  it('Should flag a gone place of origin like any other role', async () => {
    const summary = await summaryFor({
      ...fullSeed,
      placeOfOrigin: { addressId: 'gone' }
    })

    expect(summary.errorList.map((entry) => entry.text)).toContain(
      'Select an address for the place of origin'
    )
  })

  it('Should not flag a submitted notification', async () => {
    const { context } = await viewForStatus(SUBMITTED, {
      ...fullSeed,
      consignor: { addressId: 'gone' }
    })
    expect(context.errorSummary).toBeNull()
  })

  it('Should flag an amend, which is still being worked on', async () => {
    const { context } = await viewForStatus(AMEND, {
      ...fullSeed,
      consignor: { addressId: 'gone' }
    })
    expect(context.errorSummary.errorList[0].text).toBe(CONSIGNOR_ERROR)
  })
})

// The rest of this file drives the handler directly, which skips the plugin
// registration that installs the read-path sanitiser — so those tests never see
// the answers the sanitiser strips. The server always has it installed, and it
// deletes a party whose reference no longer resolves: exactly the answer this
// page has to name. These cases wire the real sanitiser so the page is asserted
// against the state a trader can actually reach.
describe(`${SUITE} — outstanding roles behind the read-path sanitiser`, () => {
  setupCheckAnswersEngine()

  beforeAll(() => configureAnswersForRead(withoutUnresolvedPartyRefs))
  afterAll(() => configureAnswersForRead((_request, answers) => answers))

  it('Should still name a deleted address the sanitiser has stripped', async () => {
    const { view } = await driveHandler(getHandler, {
      seed: { ...fullSeed, consignor: { addressId: 'gone' } }
    })
    const card = cardByTitle(view.context.sections, ROLES_AND_ADDRESSES_CARD)

    expect(view.context.errorSummary.errorList[0].text).toBe(CONSIGNOR_ERROR)
    expect(htmlOf(card.rows, 'Consignor')).toContain('govuk-error-message')
    expect(valueOf(card.rows, 'Consignor')).not.toBe(NOT_APPLICABLE)
  })

  it('Should still refuse Continue while that deleted address stands', async () => {
    const { response } = await driveHandler(postHandler, {
      seed: { ...fullSeed, consignor: { addressId: 'gone' } }
    })

    expect(response.redirect).toBeUndefined()
    expect(response.statusCode).toBe(400)
  })

  it('Should leave a role that was never answered marked missing', async () => {
    const { view } = await driveHandler(getHandler, {
      seed: withoutParty(fullSeed, 'importer')
    })
    const card = cardByTitle(view.context.sections, ROLES_AND_ADDRESSES_CARD)

    expect(
      view.context.errorSummary.errorList.map((entry) => entry.text)
    ).not.toContain('Select an address for the importer')
    expect(htmlOf(card.rows, 'Importer')).toBe(MISSING_HTML)
  })
})

// The CYA commodity gates (packages / unweaned / CPH) read the obligation
// `.metadata.values` (CN codes), normalising the stored commodity name to a
// code. This matrix pins the gate outcome per selectable species
// (Cow/Horse/Cat/Dog/Fish).
describe(`${SUITE} — commodity-gate render matrix — model metadata per selectable species`, () => {
  setupCheckAnswersEngine()

  const gatesFor = async (commodity) => {
    const sections = await sectionsFor({
      commodityLines: [{ commoditySelection: commodity }]
    })
    const allKeys = keysOf(rowsOf(sections))
    const speciesCard = cardByTitle(
      sections,
      `${commodity} (${commodityCodeFor(commodity)})`
    )
    return {
      packages: keysOf(speciesCard.rows).includes(PACKAGES_KEY),
      unweaned: allKeys.includes(UNWEANED_KEY),
      cph: allKeys.includes(CPH_KEY)
    }
  }

  const MATRIX = [
    { commodity: 'Cow', packages: true, unweaned: true, cph: true },
    // Design release 1 asks the unweaned-animals question only of a commodity
    // carrying unweaned options, and a horse carries none.
    { commodity: 'Horse', packages: true, unweaned: false, cph: false },
    { commodity: 'Cat', packages: true, unweaned: false, cph: false },
    { commodity: 'Dog', packages: true, unweaned: false, cph: false },
    { commodity: 'Fish', packages: false, unweaned: false, cph: false }
  ]

  it.each(MATRIX)(
    'Should gate packages/unweaned/CPH for $commodity',
    async ({ commodity, packages, unweaned, cph }) => {
      expect(await gatesFor(commodity)).toEqual({ packages, unweaned, cph })
    }
  )
})

describe(`${SUITE} — POST navigation`, () => {
  setupCheckAnswersEngine()

  const withParties = (seed) => ({
    ...seed,
    consignor: fullSeed.consignor,
    consignee: fullSeed.consignee,
    importer: fullSeed.importer,
    placeOfDestination: fullSeed.placeOfDestination
  })

  // Continue used to carry an unfinished notification through to the
  // declaration, where the submit failed its readiness check and bounced the
  // trader back here saying nothing. It is refused on this page instead.
  it('Should refuse Continue while the notification is unfinished', async () => {
    const { response } = await driveHandler(postHandler, {
      seed: withParties({})
    })

    expect(response.redirect).toBeUndefined()
    expect(response.statusCode).toBe(400)
  })

  it('Should redirect to the declaration once the notification is complete', async () => {
    const { response } = await driveHandler(postHandler, { seed: fullSeed })

    expect(response.redirect).toMatch(/\/declaration$/)
  })

  it('Should refuse Continue while a referenced role is outstanding', async () => {
    const { response } = await driveHandler(postHandler, {
      seed: { ...fullSeed, consignor: { addressId: 'gone' } }
    })

    expect(response.redirect).toBeUndefined()
    expect(response.statusCode).toBe(400)
  })

  it('Should refuse Continue on a brand-new draft, naming what is outstanding', async () => {
    const { response, view } = await driveHandler(postHandler, { seed: {} })

    expect(response.statusCode).toBe(400)
    expect(view.context.errorSummary.errorList.length).toBeGreaterThan(0)
  })

  it('Should re-render the page with the summary when Continue is refused', async () => {
    const { view } = await driveHandler(postHandler, {
      seed: { ...fullSeed, consignor: { addressId: 'gone' } }
    })

    expect(view.context.errorSummary.errorList[0].text).toBe(CONSIGNOR_ERROR)
  })

  it('Should move focus to the summary when Continue is refused', async () => {
    const { view } = await driveHandler(postHandler, {
      seed: { ...fullSeed, consignor: { addressId: 'gone' } }
    })

    expect(view.context.errorSummary.disableAutoFocus).toBe(false)
  })

  it('Should not refuse a submitted notification carrying a deleted address', async () => {
    const journey = await store.create()
    await store.seedAnswers(journey.journeyId, {
      ...fullSeed,
      consignor: { addressId: 'gone' }
    })
    await store.submit(journey.journeyId)

    const response = await postHandler(
      journeyRequest(journey.journeyId),
      stubH()
    )

    expect(response.statusCode).not.toBe(400)
    expect(response.redirect).toBeDefined()
  })
})

// Design release 1 heads the review page of an unfinished notification with
// "There is a problem", names each unfinished card, marks the card itself, and
// refuses to go on. Before this, the page looked finished: no summary, no
// marking, and a live Continue that carried the trader to the declaration only
// to bounce them back here with nothing said.
describe(`${SUITE} — the unfinished notification`, () => {
  setupCheckAnswersEngine()

  const textsFor = async (seed) =>
    (await summaryFor(seed)).errorList.map((entry) => entry.text)

  const cardById = (sections, id) =>
    cardsOf(sections).find((card) => card.id === id)

  it('Should head a brand-new draft with one entry per unfinished card, in page order', async () => {
    expect(await textsFor({})).toEqual([
      IMPORT_DETAILS_INCOMPLETE,
      'Complete reason for import',
      SPECIES_INCOMPLETE,
      'Complete additional animal details',
      'Complete arrival details',
      'Complete transport details',
      'Complete roles and addresses',
      'Complete contact address for this consignment'
    ])
  })

  it('Should name only the cards still outstanding as the trader gets further', async () => {
    const texts = await textsFor({
      countryOfOrigin: 'FR',
      regionOfOriginCodeRequirement: 'no',
      portOfEntry: 'GB ABD',
      arrivalDateAtPort: { day: '12', month: '12', year: '2026' },
      meansOfTransport: 'ROAD_VEHICLE',
      transportIdentification: 'FR-892-LK',
      transportDocumentReference: 'CMR-2026-884721'
    })

    expect(texts).not.toContain(IMPORT_DETAILS_INCOMPLETE)
    expect(texts).not.toContain('Complete arrival details')
    expect(texts).toContain('Complete transport details')
  })

  it('Should anchor each entry to the card it names', async () => {
    const summary = await summaryFor(withoutParty(fullSeed, 'importer'))

    expect(summary.errorList).toEqual([
      { text: ADDRESSES_INCOMPLETE, href: '#roles-and-addresses' }
    ])
  })

  it('Should title the summary There is a problem', async () => {
    expect((await summaryFor({})).titleText).toBe('There is a problem')
  })

  it('Should repeat the message inside the card it names', async () => {
    const sections = await sectionsFor(withoutParty(fullSeed, 'importer'))

    expect(cardById(sections, 'rolesAndAddresses').error).toBe(
      ADDRESSES_INCOMPLETE
    )
  })

  it('Should leave a finished card unmarked', async () => {
    const sections = await sectionsFor(withoutParty(fullSeed, 'importer'))

    expect(cardById(sections, 'arrivalDetails').error).toBeNull()
    expect(cardById(sections, 'arrivalDetails').anchor).toBe('arrival-details')
  })

  it('Should say nothing is outstanding on a complete notification', async () => {
    expect(await summaryFor(fullSeed)).toBeNull()
  })

  it('Should say nothing is outstanding on a submitted notification', async () => {
    const { context } = await viewForStatus(
      SUBMITTED,
      withoutParty(fullSeed, 'importer')
    )

    expect(context.errorSummary).toBeNull()
    expect(cardById(context.sections, 'rolesAndAddresses').error).toBeNull()
  })

  // The only summary anchor that is not copied onto the card it names: every
  // other one rides along on the card via `decorateCard`, while this one is the
  // section heading's own id. The two literals live in different modules, so
  // they have to be checked against each other.
  it('Should resolve the species entry to a section anchor that exists on the page', async () => {
    const { view } = await driveHandler(getHandler, { seed: {} })
    const entry = view.context.errorSummary.errorList.find(
      (item) => item.text === SPECIES_INCOMPLETE
    )

    expect(entry.href).toBe('#description-of-the-goods')
    expect(
      view.context.sections.some(
        (section) => section.anchor === 'description-of-the-goods'
      )
    ).toBe(true)
  })

  // DOCUMENTED EXCEPTION, not an oversight: species cards carry no id, so
  // `decorateCard` never marks them. The summary still names the outstanding
  // work. See inc-150's open question on marking a short species card.
  it('Should name species in the summary while leaving the species cards unmarked', async () => {
    // Two lines, the second barely started: species cards are built for both,
    // and the species rows stay outstanding.
    const seed = {
      commodityLines: [
        fullSeed.commodityLines[0],
        { commoditySelection: 'Cow' }
      ]
    }

    expect(await textsFor(seed)).toContain(SPECIES_INCOMPLETE)

    const sections = await sectionsFor(seed)
    const speciesCard = cardsOf(sections).find((card) => card.identifierTable)

    expect(speciesCard).toBeDefined()
    expect(speciesCard.error).toBeUndefined()
  })

  // The card `id` literals are the only join between the built cards and
  // REVIEW_CARDS, and `decorateCard` fails silently on a miss: the summary would
  // still emit "Complete <card>" with an href pointing at nothing. `species` is
  // the deliberate exception — it anchors to a section heading, not a card.
  it('Should build a card for every REVIEW_CARDS entry that anchors to one', async () => {
    // A fully-populated seed rather than an empty draft: transit countries are
    // the one card built conditionally, and they apply to an overland arrival.
    const sections = await sectionsFor(fullSeed)
    const builtIds = cardsOf(sections).map((card) => card.id)
    const anchoredIds = REVIEW_CARDS.filter(
      (card) => card.id !== 'species'
    ).map((card) => card.id)

    expect(builtIds).toEqual(expect.arrayContaining(anchoredIds))
  })

  // The transit-countries card stands only while the answer is in scope, so a
  // summary entry for it on a draft that never asked the question would point
  // at an anchor the page does not carry. Its task row is NA out of scope,
  // which is what keeps the two in step.
  it('Should anchor every summary entry to an id the page carries', async () => {
    const summary = await summaryFor({})
    const sections = await sectionsFor({})
    const ids = [
      ...sections.map((section) => section.anchor),
      ...cardsOf(sections)
        .map((card) => card.anchor)
        .filter(Boolean)
    ]

    for (const entry of summary.errorList) {
      expect(ids, entry.text).toContain(entry.href.slice(1))
    }
  })
})

// The POST refuses on `scope.readyForCheckYourAnswers`, and the summary is
// built from REVIEW_CARDS. The two agree only while every task row is covered
// exactly once — otherwise a refusal could arrive with nothing named, or a card
// could be flagged for a row the hub does not count.
describe('#REVIEW_CARDS — the cards cover the task rows exactly', () => {
  it('Should map every task row to exactly one card', () => {
    const covered = REVIEW_CARDS.flatMap((card) => card.rows)

    expect([...covered].sort()).toEqual(taskRows.map((row) => row.id).sort())
  })

  it('Should carry a message for every card', () => {
    for (const card of REVIEW_CARDS) {
      expect(typeof copyEn.errors.cards[card.id]).toBe('string')
    }
  })
})
