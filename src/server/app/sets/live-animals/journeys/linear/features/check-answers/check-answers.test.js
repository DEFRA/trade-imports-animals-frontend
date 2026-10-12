import Boom from '@hapi/boom'
import { SET_ID } from '../../../../set.js'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

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
import { STUB_BOOK } from '../../../../../../services/address-book/stub/index.js'
import * as addressBook from '../../../../../../services/address-book/index.js'
import { dashboardPath, pagePath } from '../../../../../../shared/paths.js'
import { answerForInlineParty } from '../addresses/party-inline.js'
import { taskRows } from '../../flow/task-rows.js'
import { dispatchPages } from '../index.js'
import { routes } from './controller.js'
import { buildSections } from './view-model/index.js'
import { additionalAnimalDetailsCard } from './view-model/cards/consignment/additional-animal-details.js'
import { cardAnchorHref, REVIEW_CARDS } from './view-model/incomplete-cards.js'
import { copy as copyEn } from './copy/copy.en.js'
import { copy as transportCopy } from '../transport/copy/copy.en.js'
import { copy as documentsEn } from '../documents/copy/copy.en.js'

const getHandler = routes.find((route) => route.method === 'GET').handler
const postHandler = routes.find((route) => route.method === 'POST').handler

const dateMonthsAhead = (months) => {
  const date = new Date()
  date.setMonth(date.getMonth() + months)
  return {
    day: String(date.getDate()),
    month: String(date.getMonth() + 1),
    year: String(date.getFullYear())
  }
}

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

const cardsOf = (sections) => sections.flatMap((section) => section.cards)

const cardByTitle = (sections, title) =>
  cardsOf(sections).find((card) => card.title === title)

const blockRowsOf = (card) =>
  (card.speciesBlocks ?? []).flatMap((block) => block.rows)

const blockOf = (card, heading) =>
  card.speciesBlocks.find((block) => block.heading === heading)

const rowsOf = (sections) =>
  cardsOf(sections).flatMap((card) => [
    ...(card.rows ?? []),
    ...blockRowsOf(card),
    ...(card.subsections ?? []).flatMap((subsection) => subsection.rows)
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
    ...[...(card.rows ?? []), ...blockRowsOf(card)].flatMap((entry) =>
      (entry.actions?.items ?? []).map((action) => action.href)
    ),
    ...(card.subsections ?? []).flatMap((subsection) =>
      subsection.rows.flatMap((entry) =>
        (entry.actions?.items ?? []).map((action) => action.href)
      )
    ),
    ...(card.speciesBlocks ?? [])
      .flatMap((block) => block.identifierTable?.actions?.items ?? [])
      .map((action) => action.href)
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
const CONSIGNOR_ERROR = 'Correct the address details for the consignor'
const CONTACT_ERROR = 'Correct the contact address details for this consignment'
const IMPORT_DETAILS_INCOMPLETE = 'Complete origin of import'
const ADDRESSES_INCOMPLETE = 'Complete roles and addresses'
const WHAT_ARE_YOU_IMPORTING_INCOMPLETE = 'Complete what are you importing?'
const COMMODITY_DETAILS_INCOMPLETE = 'Complete commodity details'
const DOCUMENTS_INCOMPLETE = 'Complete documents'
const ARRIVAL_DETAILS_INCOMPLETE = 'Complete arrival details'
const FELIS_NO_IDENTIFIER = 'Enter at least 1 animal identifier for felis catus'
const SPECIES_UNFINISHED =
  /^Enter (the number of animals|at least 1 animal identifier) for /

const withoutParty = (seed, partyId) => {
  const next = { ...seed }
  delete next[partyId]
  return next
}
const ADDRESS_LINE_1 = '43 East Hague Extension'
const CONSIGNOR_NAME = 'Astra Rosales'
const CONSIGNOR_ADDRESS_ID = 'astra-rosales'

const copyOf = (id) =>
  answerForInlineParty(STUB_BOOK.find((record) => record.id === id))

// A copy that breaks the address-book rules — no address line, town or
// postcode — but still has a name to show.
const BROKEN_COPY = { name: 'Broken Copy Ltd', address: { countryCode: 'CH' } }
const COW_CARD_TITLE = 'Cow (0102)'
const FISH_CARD_TITLE = 'Fish (0301)'
const BOS_TAURUS = 'Bos Taurus'
const DESCRIPTION_ANCHOR = 'description-of-the-goods'
const COMMODITY_CODE_KEY = 'Commodity code'
const COMMON_NAME_KEY = 'Common name'
const SPECIES_KEY = 'Species'
const WHAT_ARE_YOU_IMPORTING_CARD = 'What are you importing?'
const IMPORT_DETAILS_CARD = 'Origin of import'
const REASON_FOR_IMPORT_CARD = 'Main import reason'
const ADDITIONAL_ANIMAL_DETAILS_CARD = 'Additional details'
const ARRIVAL_DETAILS_CARD = 'Arrival details'
const TRANSIT_COUNTRIES_HEADING = 'Transit countries'
const TRANSPORT_DETAILS_CARD = 'Transport details'
const ROLES_AND_ADDRESSES_CARD = 'Addresses'
const CONTACT_ADDRESS_CARD = 'Contact address'
const CONTACT_ADDRESS_KEY = 'Contact address'
const MAIN_IMPORT_REASON_KEY = 'Main import reason'
const DOCUMENT_1_CARD = 'Document 1'
const HEALTH_CERTIFICATE_WARNING = 'You need to upload a health certificate'
const DOCUMENT_2_CARD = 'Document 2'
const DOCUMENT_REFERENCE_KEY = 'Document reference'
const DATE_OF_ISSUE_KEY = 'Date of issue'
const DOCUMENTS_SECTION_ANCHOR = 'documents-section'
const ATTACHMENT_KEY = 'Attachment'
const NO_DOCUMENTS_SENTENCE = 'You have not added any documents yet.'
const TRANSPORT_AND_ARRIVAL_ANCHOR = 'transport-and-arrival'
const COUNTRY_OF_ORIGIN_KEY = 'Country of origin'
const PURPOSE_IN_MARKET_KEY = 'Purpose in the market'
const REGION_CODE_KEY = 'Region of origin code'
const INTERNAL_REFERENCE_KEY = 'Internal reference number'
const UNWEANED_KEY = 'Includes unweaned animals'
const CPH_KEY = 'County parish holding (CPH) number'
const TRANSITED_COUNTRIES_KEY =
  'Countries that the consignment will travel through'
const PACKAGES_KEY = 'Number of packages (when required)'
const DOCUMENT_TYPE_KEY = 'Document type'
const DESTINATION_COUNTRY_KEY = 'Destination country'
const EXIT_DATE_KEY = 'Exit date'
const PORT_OF_EXIT_KEY = 'Port of exit'
const APPROVAL_NUMBER_KEY = 'Approval number'
const PRIVATE_TRANSPORTER_NAME = 'Jean Dupont'
const EXIT_BCP_KEY = 'Exit border control post'
const ARRIVAL_DATE_KEY = 'Arrival date at destination'

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
      accompanyingDocumentDateOfIssue: { day: '12', month: '12', year: '2025' },
      filename: 'health-certificate.pdf'
    }
  ],
  placeOfOrigin: copyOf('origin-farm'),
  consignor: copyOf(CONSIGNOR_ADDRESS_ID),
  consignee: copyOf('british-livestock-ltd'),
  importer: copyOf('import-co-uk'),
  placeOfDestination: copyOf('tech-imports-ltd'),
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
  contactAddress: copyOf('animal-and-plant-health-agency')
}

const itahcSeed = {
  ...fullSeed,
  documents: [{ ...fullSeed.documents[0], accompanyingDocumentType: 'ITAHC' }]
}

const twoDocumentsSeed = {
  ...fullSeed,
  documents: [
    fullSeed.documents[0],
    {
      accompanyingDocumentType: 'AIR_WAYBILL',
      accompanyingDocumentAttachmentType: 'PNG',
      accompanyingDocumentReference: 'AWB-778',
      accompanyingDocumentDateOfIssue: { day: '2', month: '1', year: '2026' },
      filename: 'waybill.png'
    }
  ]
}

const SUITE = `#${buildSections.name} (check-answers GET)`

const setupCheckAnswersEngine = () => {
  beforeAll(() => {
    configureRecords(SET_ID, recordsStub)
    configureSession(SET_ID, sessionStub)
    buildDispatch(SET_ID, dispatchPages)
  })
  beforeEach(() => store.clear())
}

const noDocumentsSeed = () => {
  const seed = { ...fullSeed }
  delete seed.documents
  return seed
}

describe(`${SUITE} — submitted with action required`, () => {
  setupCheckAnswersEngine()

  it('Should tag the view Submitted action required in orange, read-only, with no Change links', async () => {
    const { context } = await viewForStatus(SUBMITTED, noDocumentsSeed())

    expect(context.readOnly).toBe(true)
    expect(context.viewHeader.status).toEqual({
      text: 'Submitted action required',
      classes: 'govuk-tag--orange'
    })
    expect(changeHrefsOf(context.sections)).toEqual([])
  })

  it('Should warn that a health certificate is needed', async () => {
    const { context } = await viewForStatus(SUBMITTED, noDocumentsSeed())

    expect(context.viewHeader.warning).toBe(HEALTH_CERTIFICATE_WARNING)
  })

  it('Should show Upload a valid health certificate in place of document cards, with no error summary', async () => {
    const { context } = await viewForStatus(SUBMITTED, noDocumentsSeed())
    const section = context.sections.find(
      ({ anchor }) => anchor === DOCUMENTS_SECTION_ANCHOR
    )

    expect(section.cards).toEqual([])
    expect(section.error).toBe('Upload a valid health certificate')
    expect(context.errorSummary).toBeNull()
  })

  it('Should keep the document cards when a document other than a health certificate is held', async () => {
    const { context } = await viewForStatus(SUBMITTED)
    const section = context.sections.find(
      ({ anchor }) => anchor === DOCUMENTS_SECTION_ANCHOR
    )

    expect(section.error).toBeUndefined()
    expect(section.cards.map((card) => card.title)).toEqual([DOCUMENT_1_CARD])
    expect(context.viewHeader.warning).toBe(HEALTH_CERTIFICATE_WARNING)
  })

  it('Should end with Continue posting to amend, and offer Amend, Copy as new and Delete in its header', async () => {
    const { context } = await viewForStatus(SUBMITTED, noDocumentsSeed())

    expect(context.viewHeader.continueHref).toMatch(/\/amend$/)
    expect(context.viewHeader.actions).toMatchObject({
      amendHref: expect.stringMatching(/\/amend$/),
      copyHref: expect.stringMatching(/\/copy$/),
      copyIsPrimary: false,
      deleteHref: expect.stringMatching(/\/delete$/)
    })
  })

  it('Should date the view with the day it was submitted', async () => {
    const { context } = await viewForStatus(SUBMITTED, noDocumentsSeed())

    expect(context.viewHeader.dateSubmitted).toMatch(/^Date submitted: /)
  })
})

describe(`${SUITE} — journey lifecycle editability`, () => {
  setupCheckAnswersEngine()

  it('Should omit every Change href for a submitted journey', async () => {
    const view = await viewForStatus(SUBMITTED)

    expect(view.context.readOnly).toBe(true)
    expect(changeHrefsOf(view.context.sections)).toEqual([])
    expect(view.context.viewHeader.actions).toMatchObject({
      amendHref: expect.stringMatching(/\/amend$/),
      copyHref: expect.stringMatching(/\/copy$/),
      copyIsPrimary: false,
      deleteHref: expect.stringMatching(/\/delete$/)
    })
  })

  it("Should show a submitted notification's import reference numbers", async () => {
    const { context } = await viewForStatus(SUBMITTED)

    expect(
      context.viewHeader.importReferences.map(({ key, value }) => [
        key.text,
        value.text
      ])
    ).toEqual([
      ['Notification reference', context.viewHeader.reference],
      ['Customs document code', 'C640']
    ])
  })

  it.each([DRAFT, AMEND])(
    'Should retain Change hrefs for an editable %s journey',
    async (status) => {
      const view = await viewForStatus(status)
      const hrefs = changeHrefsOf(view.context.sections)

      expect(view.context.readOnly).toBe(false)
      expect(hrefs).not.toHaveLength(0)
      expect(hrefs).toEqual(
        expect.arrayContaining([expect.stringMatching(/\/origin\?change=1$/)])
      )
    }
  )

  it('Should keep the single Document 1 card readable on a draft with nothing uploaded', async () => {
    const seed = { ...fullSeed }
    delete seed.documents
    const view = await viewForStatus(DRAFT, seed)
    const card = cardByTitle(view.context.sections, DOCUMENT_1_CARD)

    expect(valueOf(card.rows, DOCUMENT_REFERENCE_KEY)).toBe(NOT_APPLICABLE)
  })

  it("Should offer Cancel amend as the review's own control while amending, and never in the strip", async () => {
    const draft = await viewForStatus(DRAFT)
    const submitted = await viewForStatus(SUBMITTED)
    const amend = await viewForStatus(AMEND)

    expect(draft.context.cancelAmendHref).toBeNull()
    expect(submitted.context.cancelAmendHref).toBeNull()
    expect(amend.context.cancelAmendHref).toMatch(/\/cancel-amend$/)
    expect(submitted.context.journeyStrip).toBeNull()
    expect(draft.context.journeyStrip).toBeNull()
    expect(amend.context.journeyStrip.cancelAmend).toBeUndefined()
  })

  it("Should head a submitted notification's view with its reference and a Submitted tag, with no status bar", async () => {
    const { context } = await viewForStatus(SUBMITTED, itahcSeed)

    expect(context.viewHeader.reference).toBe(context.heading)
    expect(context.viewHeader.reference).toMatch(/\S/)
    expect(context.viewHeader.status).toEqual({
      text: 'Submitted',
      classes: 'govuk-tag--green'
    })
    expect(context.viewHeader.warning).toBeNull()
    expect(context.viewHeader.continueHref).toBeNull()
    expect(context.journeyStrip).toBeNull()
  })

  it("Should title a submitted view and a draft's review by its reference, and an amendment's review Review your notification", async () => {
    for (const status of [SUBMITTED, DRAFT]) {
      const { context } = await viewForStatus(status)
      expect(context.pageTitle).toBe(context.viewHeader.reference)
    }

    const { context } = await viewForStatus(AMEND)
    expect(context.pageTitle).toBe(copyEn.title)
    expect(context.viewHeader).toBeNull()
    expect(context.journeyStrip).not.toBeNull()
  })

  it("Should date a submitted notification's view with the UK day it was submitted", async () => {
    vi.useFakeTimers()
    try {
      vi.setSystemTime(new Date('2026-07-21T23:30:00Z'))
      const { context } = await viewForStatus(SUBMITTED)

      expect(context.viewHeader.dateSubmitted).toBe(
        'Date submitted: 22 July 2026'
      )
    } finally {
      vi.useRealTimers()
    }
  })

  it("Should point a submitted view's and a draft's Back link at the live-animals notification list, and an amendment's at Overview", async () => {
    const submitted = await viewForStatus(SUBMITTED)
    const draft = await viewForStatus(DRAFT)
    const amend = await viewForStatus(AMEND)

    expect(submitted.context.backLink).toBe(dashboardPath())
    expect(draft.context.backLink).toBe(dashboardPath())
    expect(amend.context.deleteHref).toBe(`${amend.context.backLink}/delete`)
    expect(amend.context.backLink).not.toBe(dashboardPath())
  })

  it('Should send a notification that cannot be found to the notification list', async () => {
    const h = stubH()
    const response = await getHandler(journeyRequest('GBN-AG-00-000000'), h)

    expect(response.redirect).toBe(dashboardPath())
  })

  it('Should let an error other than not-found propagate instead of redirecting to the notification list', async () => {
    const journey = await store.create()
    const loadSpy = vi
      .spyOn(records, 'load')
      .mockRejectedValueOnce(Boom.badImplementation('store unavailable'))

    try {
      await expect(
        getHandler(journeyRequest(journey.journeyId), stubH())
      ).rejects.toMatchObject({ output: { statusCode: 500 } })
    } finally {
      loadSpy.mockRestore()
    }
  })

  it("Should title an amendment's review Review before re-submitting only once its answers change", async () => {
    const unchanged = await viewForStatus(AMEND)
    expect(unchanged.context.pageTitle).toBe(copyEn.title)
    expect(unchanged.context.heading).toBe(copyEn.title)

    const journey = await store.create()
    await store.seedAnswers(journey.journeyId, fullSeed)
    await store.submit(journey.journeyId)
    await records.amend(journey.journeyId)
    await store.seedAnswers(journey.journeyId, {
      ...fullSeed,
      internalReferenceNumber: 'CHANGED'
    })
    const h = stubH()
    await getHandler(journeyRequest(journey.journeyId), h)

    expect(h.captured.view.context.pageTitle).toBe(copyEn.resubmitTitle)
    expect(h.captured.view.context.heading).toBe(copyEn.resubmitTitle)

    const draft = await store.create()
    await store.seedAnswers(draft.journeyId, fullSeed)
    await store.seedAnswers(draft.journeyId, {
      ...fullSeed,
      internalReferenceNumber: 'CHANGED'
    })
    const draftView = stubH()
    await getHandler(journeyRequest(draft.journeyId), draftView)
    expect(draftView.captured.view.context.heading).toBe(draft.journeyId)
  })

  it('Should keep Review your notification when only the documents change during an amendment', async () => {
    const journey = await store.create()
    await store.seedAnswers(journey.journeyId, fullSeed)
    await store.submit(journey.journeyId)
    await records.amend(journey.journeyId)
    await store.seedAnswers(journey.journeyId, twoDocumentsSeed)
    const h = stubH()

    await getHandler(journeyRequest(journey.journeyId), h)

    expect(h.captured.view.context.heading).toBe(copyEn.title)
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

describe(`${SUITE} — draft review header`, () => {
  setupCheckAnswersEngine()

  it("Should head a draft's review with its reference, a Draft tag, the date created and its header actions, with no status bar", async () => {
    const { context } = await viewForStatus(DRAFT)
    const { viewHeader } = context

    expect(viewHeader.reference).toBe(context.heading)
    expect(viewHeader.status).toEqual({
      text: 'Draft',
      classes: 'govuk-tag--blue'
    })
    expect(viewHeader.dateCreated).toMatch(/^Date created: /)
    expect(viewHeader.dateSubmitted).toBeNull()
    expect(viewHeader.actions).toMatchObject({
      amendHref: null,
      copyHref: expect.stringMatching(/\/copy$/),
      copyIsPrimary: true,
      deleteHref: expect.stringMatching(/\/delete$/)
    })
    expect(
      viewHeader.importReferences.map(({ key, value }) => [
        key.text,
        value.text
      ])
    ).toEqual([
      ['Notification reference', viewHeader.reference],
      ['Customs document code', 'C640']
    ])
    expect(context.journeyStrip).toBeNull()
    expect(context.deleteHref).toBeNull()
  })

  it("Should date a draft's review with the UK day it was created", async () => {
    vi.useFakeTimers()
    try {
      vi.setSystemTime(new Date('2026-07-21T23:30:00Z'))
      const { context } = await viewForStatus(DRAFT)

      expect(context.viewHeader.dateCreated).toBe('Date created: 22 July 2026')
    } finally {
      vi.useRealTimers()
    }
  })

  it("Should keep an amendment's review unheaded, with the status bar and Delete at its foot", async () => {
    const { context } = await viewForStatus(AMEND)

    expect(context.viewHeader).toBeNull()
    expect(context.journeyStrip).not.toBeNull()
    expect(context.deleteHref).toMatch(/\/delete$/)
  })
})

// Design release 2.1 lays the review out as six numbered sections mirroring the
// task list, with every card straight under its section and no subsection
// heading between them. The numbers are part of the heading copy, so the order
// here and the numbering there have to agree.
describe(`${SUITE} — section headings and card titles`, () => {
  setupCheckAnswersEngine()

  it('Should render the numbered design sections in order', async () => {
    const sections = await sectionsFor(fullSeed)
    expect(sections.map((section) => section.heading)).toEqual([
      '1. About the consignment',
      '2. Description of the goods',
      '3. Transport and arrival',
      '4. Uploaded documents',
      '5. Consignment addresses',
      '6. Contact address'
    ])
  })

  it('Should give every section its cards directly, with no subsection heading', async () => {
    const sections = await sectionsFor(fullSeed)

    expect(sections.length).toBeGreaterThan(0)
    for (const section of sections) {
      expect(section).not.toHaveProperty('groups')
      expect(Array.isArray(section.cards), section.anchor).toBe(true)
      expect(section.cards.length, section.anchor).toBeGreaterThan(0)
    }
  })

  it('Should title each card as design release 2.1 names it', async () => {
    const sections = await sectionsFor(fullSeed)

    expect(cardsOf(sections).map((card) => card.title)).toEqual([
      IMPORT_DETAILS_CARD,
      WHAT_ARE_YOU_IMPORTING_CARD,
      REASON_FOR_IMPORT_CARD,
      COW_CARD_TITLE,
      ADDITIONAL_ANIMAL_DETAILS_CARD,
      ARRIVAL_DETAILS_CARD,
      TRANSPORT_DETAILS_CARD,
      DOCUMENT_1_CARD,
      ROLES_AND_ADDRESSES_CARD,
      CONTACT_ADDRESS_CARD
    ])
  })

  // Which numbered section a card sits under is the whole substance of design
  // release 2.1's layout, and a flattened list cannot see it move.
  it('Should place each card under the numbered section that owns it', async () => {
    const sections = await sectionsFor(fullSeed)

    expect(
      sections.map((section) => [
        section.anchor,
        section.cards.map((card) => card.title)
      ])
    ).toEqual([
      [
        'about-the-consignment',
        [
          IMPORT_DETAILS_CARD,
          WHAT_ARE_YOU_IMPORTING_CARD,
          REASON_FOR_IMPORT_CARD
        ]
      ],
      [DESCRIPTION_ANCHOR, [COW_CARD_TITLE, ADDITIONAL_ANIMAL_DETAILS_CARD]],
      [
        TRANSPORT_AND_ARRIVAL_ANCHOR,
        [ARRIVAL_DETAILS_CARD, TRANSPORT_DETAILS_CARD]
      ],
      [DOCUMENTS_SECTION_ANCHOR, [DOCUMENT_1_CARD]],
      ['consignment-parties', [ROLES_AND_ADDRESSES_CARD]],
      ['contact-address-section', [CONTACT_ADDRESS_CARD]]
    ])
  })

  it("Should key the main import reason card's first row Main import reason", async () => {
    const sections = await sectionsFor(fullSeed)

    expect(keysOf(cardByTitle(sections, REASON_FOR_IMPORT_CARD).rows)[0]).toBe(
      MAIN_IMPORT_REASON_KEY
    )
  })

  it('Should link the Addresses card to the roles and addresses page and the Contact address card to the contact address page', async () => {
    const sections = await sectionsFor(fullSeed)
    const addresses = cardByTitle(sections, ROLES_AND_ADDRESSES_CARD)
    const contact = cardByTitle(sections, CONTACT_ADDRESS_CARD)

    expect(addresses.actions.items).toHaveLength(1)
    expect(addresses.actions.items[0].href).toMatch(/\/addresses\?change=1$/)
    expect(contact.actions.items).toHaveLength(1)
    expect(contact.actions.items[0].href).toMatch(
      /\/consignment\/contact\/select\?change=1$/
    )
  })
})

describe(`${SUITE} — fully-populated notification`, () => {
  setupCheckAnswersEngine()

  it('Should resolve service-backed labels for coded answers', async () => {
    const rows = rowsOf(await sectionsFor(fullSeed))
    expect(valueOf(rows, COUNTRY_OF_ORIGIN_KEY)).toBe('France')
    expect(valueOf(rows, MAIN_IMPORT_REASON_KEY)).toBe('Internal market')
    expect(valueOf(rows, PURPOSE_IN_MARKET_KEY)).toBe('Breeding')
    expect(valueOf(rows, 'Certified for')).toBe('Slaughter')
  })

  it('Should map yes/no coded answers to Yes/No labels', async () => {
    const rows = rowsOf(await sectionsFor(fullSeed))
    expect(valueOf(rows, UNWEANED_KEY)).toBe('No')
  })

  it.each(Object.entries(transportCopy.portOfEntry.means.options))(
    'Should read every means of transport back with the label the arrival page gives it',
    async (code, label) => {
      const rows = rowsOf(
        await sectionsFor({ ...fullSeed, meansOfTransport: code })
      )
      expect(valueOf(rows, 'Means of transport to the port of entry')).toBe(
        label
      )
    }
  )

  it('Should map the means-of-transport enum to its display label', async () => {
    const rows = rowsOf(await sectionsFor(fullSeed))
    expect(valueOf(rows, 'Means of transport to the port of entry')).toBe(
      'Road'
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
    expect(valueOf(card.rows, APPROVAL_NUMBER_KEY)).toBe('ES-T2-45001294')
    expect(valueOf(card.rows, 'Type')).toBe('Commercial')
  })

  it('Should give the commodity card one block per species, headed with its name in title case, with the animal and package rows only', async () => {
    const card = cardByTitle(await sectionsFor(fullSeed), COW_CARD_TITLE)
    expect(card.speciesBlocks).toHaveLength(1)
    const [block] = card.speciesBlocks
    expect(block.heading).toBe(BOS_TAURUS)
    expect(keysOf(block.rows)).toEqual(['Number of animals', PACKAGES_KEY])
    expect(valueOf(block.rows, 'Number of animals')).toBe('25')
    expect(valueOf(block.rows, PACKAGES_KEY)).toBe('5')
  })

  it("Should head the species block's identifier table with every identifier the commodity asks for and label each animal by species and number", async () => {
    const card = cardByTitle(await sectionsFor(fullSeed), COW_CARD_TITLE)
    const { identifierTable } = blockOf(card, BOS_TAURUS)
    expect(identifierTable.head.map((cell) => cell.text)).toEqual([
      'Animal',
      'Ear tag',
      'Passport'
    ])
    expect(identifierTable.rows).toEqual([
      [{ text: 'Bos taurus 1' }, { text: 'UK1' }, { text: 'UK123456789' }]
    ])
  })

  it('Should format the arrival date as day/month/year', async () => {
    expect(valueOf(rowsOf(await sectionsFor(fullSeed)), ARRIVAL_DATE_KEY)).toBe(
      '12/12/2026'
    )
  })

  it('Should expand party rows to the stored name, address lines and country, with no telephone or email', async () => {
    const card = cardByTitle(
      await sectionsFor(fullSeed),
      ROLES_AND_ADDRESSES_CARD
    )
    expect(htmlOf(card.rows, 'Consignor')).toBe(
      `<strong>${CONSIGNOR_NAME}</strong><br>${ADDRESS_LINE_1}<br>Bern<br>30055<br>Switzerland`
    )
    expect(htmlOf(card.rows, 'Place of destination')).toBe(
      `<strong>Tech Imports Ltd</strong><br>18 Dockside Road<br>London<br>E14 9GE<br>United Kingdom`
    )
    const contact = cardByTitle(
      await sectionsFor(fullSeed),
      CONTACT_ADDRESS_CARD
    )
    expect(htmlOf(contact.rows, CONTACT_ADDRESS_KEY)).toBe(
      `<strong>Animal and Plant Health Agency</strong><br>Woodham Lane<br>Addlestone<br>KT15 3NB<br>United Kingdom`
    )
  })

  // Design release 1 keys the contact address card's one row 'Contact address',
  // not the generic 'Address' the Transport details card keeps — on a page
  // listing seven addresses, the row has to say which one it is. The two labels
  // are separate copy strings so naming this one cannot rename the other.
  it('Should key the contact address row by name while the transporter row keeps the generic address label', async () => {
    const sections = await sectionsFor(fullSeed)

    expect(keysOf(cardByTitle(sections, CONTACT_ADDRESS_CARD).rows)).toEqual([
      CONTACT_ADDRESS_KEY
    ])
    expect(
      keysOf(cardByTitle(sections, TRANSPORT_DETAILS_CARD).rows)
    ).toContain('Address')
  })

  // Design release 1 puts the Change links in each card's heading, so the page
  // offers links per card rather than one per answer. Exactly one per card.
  // The exceptions to "rows carry no action": the transit countries row, which
  // has a page of its own inside the Arrival details card, and a copied
  // address, which can be edited on this notification, which the card's Change
  // link (re-pick from the book) does not do.
  it('Should give every card one Change action in its heading, and rows only the first species-block row, the transit countries Change and Edit details on a copied address', async () => {
    const sections = await sectionsFor(fullSeed)

    for (const card of cardsOf(sections)) {
      expect(card.actions.items, card.title).toHaveLength(1)
    }
    const rowActions = rowActionsOf(sections)
    expect(rowActions.map((action) => action.text)).toEqual([
      'Change',
      'Change',
      ...Array(6).fill('Edit details')
    ])
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

    expect(hiddenTextOf(IMPORT_DETAILS_CARD)).toBe('origin of import')
    expect(hiddenTextOf(TRANSPORT_DETAILS_CARD)).toBe('transport details')
    expect(hiddenTextOf(COW_CARD_TITLE)).toBe(COW_CARD_TITLE)
  })

  it('Should point the commodity card Change action at the consignment-details page with a change flag', async () => {
    const card = cardByTitle(await sectionsFor(fullSeed), COW_CARD_TITLE)
    expect(card.actions.items).toHaveLength(1)
    expect(card.actions.items[0].href).toMatch(
      /\/consignment-details\?change=1$/
    )
  })
})

// Each uploaded document reads back in a card of its own, naming the file.
describe(`${SUITE} — uploaded document cards`, () => {
  setupCheckAnswersEngine()

  it('Should give each uploaded document its own card, titled Document <n>, reading its reference, type, date of issue and file name', async () => {
    const sections = await sectionsFor(twoDocumentsSeed)
    const documentCards = sections.find(
      (section) => section.anchor === DOCUMENTS_SECTION_ANCHOR
    ).cards
    expect(documentCards.map((card) => card.title)).toEqual([
      DOCUMENT_1_CARD,
      DOCUMENT_2_CARD
    ])
    documentCards.forEach((card) =>
      expect(keysOf(card.rows)).toEqual([
        DOCUMENT_REFERENCE_KEY,
        DOCUMENT_TYPE_KEY,
        DATE_OF_ISSUE_KEY,
        ATTACHMENT_KEY
      ])
    )
    const [first, second] = documentCards
    expect(valueOf(first.rows, DOCUMENT_REFERENCE_KEY)).toBe('GBHC1234567890')
    expect(valueOf(first.rows, DOCUMENT_TYPE_KEY)).toBe(
      'Veterinary health certificate'
    )
    expect(valueOf(first.rows, DATE_OF_ISSUE_KEY)).toBe('12/12/2025')
    expect(valueOf(first.rows, ATTACHMENT_KEY)).toBe('health-certificate.pdf')
    expect(valueOf(second.rows, DOCUMENT_REFERENCE_KEY)).toBe('AWB-778')
    expect(valueOf(second.rows, DOCUMENT_TYPE_KEY)).toBe('Air waybill')
    expect(valueOf(second.rows, DATE_OF_ISSUE_KEY)).toBe('2/1/2026')
    expect(valueOf(second.rows, ATTACHMENT_KEY)).toBe('waybill.png')
    expect(keysOf(rowsOf(sections))).not.toContain('Attachment type')
  })

  it('Should name an ITAHC document with the same label the documents page uses', async () => {
    const card = cardByTitle(await sectionsFor(itahcSeed), DOCUMENT_1_CARD)
    expect(valueOf(card.rows, DOCUMENT_TYPE_KEY)).toBe(
      'Intra Trade Animal Health Certificate (ITAHC)'
    )
  })

  it('Should give every document card its own Change link to the documents page, named for its document', async () => {
    const sections = await sectionsFor(twoDocumentsSeed)
    const cards = [DOCUMENT_1_CARD, DOCUMENT_2_CARD].map((title) =>
      cardByTitle(sections, title)
    )
    cards.forEach((card) => {
      expect(card.actions.items).toHaveLength(1)
      expect(card.actions.items[0].href).toMatch(
        /\/accompanying-documents\?change=1$/
      )
    })
    expect(
      cards.map((card) => card.actions.items[0].visuallyHiddenText)
    ).toEqual(['document 1', 'document 2'])
  })
})

// Design release 2.1 reads the countries a consignment travels through inside
// the arrival details card, under their own heading. They are collected on
// their own page and asked for only on an overland arrival, so the subsection
// stands exactly while the answer is in scope and its row carries the link to
// that page.
describe(`${SUITE} — transit countries`, () => {
  setupCheckAnswersEngine()

  const transitRowOf = (sections) =>
    cardByTitle(sections, ARRIVAL_DETAILS_CARD).subsections[0].rows[0]

  it('Should read the transit countries inside the arrival details card under a Transit countries subsection', async () => {
    const sections = await sectionsFor(fullSeed)
    const transport = sections.find(
      (section) => section.anchor === TRANSPORT_AND_ARRIVAL_ANCHOR
    )
    const arrival = cardByTitle(sections, ARRIVAL_DETAILS_CARD)

    expect(transport.cards.map((card) => card.title)).toEqual([
      ARRIVAL_DETAILS_CARD,
      TRANSPORT_DETAILS_CARD
    ])
    expect(arrival.subsections[0].heading).toBe(TRANSIT_COUNTRIES_HEADING)
    expect(valueOf(arrival.subsections[0].rows, TRANSITED_COUNTRIES_KEY)).toBe(
      'France, Belgium'
    )
  })

  it('Should name a transited subdivision with its parent country in the arrival details card', async () => {
    const sections = await sectionsFor({
      ...fullSeed,
      transitedCountries: ['FR', 'ES-CN']
    })

    expect(valueOf(rowsOf(sections), TRANSITED_COUNTRIES_KEY)).toBe(
      'France, Canary Islands (Spain)'
    )
  })

  it('Should give the transit countries row its own Change link to the page that collects it', async () => {
    const sections = await sectionsFor(fullSeed)
    const { items } = transitRowOf(sections).actions
    const arrival = cardByTitle(sections, ARRIVAL_DETAILS_CARD)

    expect(items).toHaveLength(1)
    expect(items[0].href).toMatch(/\/transit-countries\?change=1$/)
    expect(items[0].visuallyHiddenText).toBe(
      copyEn.hidden.rows.transitedCountries
    )
    expect(arrival.actions.items).toHaveLength(1)
    expect(arrival.actions.items[0].href).toMatch(/\/port-of-entry\?change=1$/)
    expect(keysOf(arrival.rows)).not.toContain(TRANSITED_COUNTRIES_KEY)
  })

  it('Should drop the transit countries subsection when transited countries do not apply', async () => {
    const sections = await sectionsFor({
      ...fullSeed,
      meansOfTransport: 'AIRPLANE'
    })

    expect(cardByTitle(sections, ARRIVAL_DETAILS_CARD).subsections).toEqual([])
    expect(keysOf(rowsOf(sections))).not.toContain(TRANSITED_COUNTRIES_KEY)
  })

  it('Should offer no transit countries Change link on a submitted notification', async () => {
    const view = await viewForStatus(SUBMITTED)

    expect(transitRowOf(view.context.sections).actions).toBeUndefined()
  })

  it('Should mark the empty transit countries row missing inside an unfinished arrival details card', async () => {
    const sections = await sectionsFor({
      ...fullSeed,
      transitedCountries: [],
      transportIdentification: ''
    })
    const arrival = cardByTitle(sections, ARRIVAL_DETAILS_CARD)

    expect(arrival.error).toBe(ARRIVAL_DETAILS_INCOMPLETE)
    expect(arrival.subsections[0].rows[0].value.html).toBe(MISSING_HTML)
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

describe('#additionalAnimalDetailsCard — shown only with a row to show', () => {
  const JOURNEY_ID = 'journey-1'

  it('Should return no card when neither of its answers is asked', () => {
    expect(
      additionalAnimalDetailsCard(JOURNEY_ID, {}, new Set(), false)
    ).toBeNull()
  })

  it('Should show the certified-for row and a Change link while the page is in the journey', () => {
    const card = additionalAnimalDetailsCard(
      JOURNEY_ID,
      { animalsCertifiedFor: 'slaughter' },
      new Set(['animalsCertifiedFor']),
      false
    )

    expect(keysOf(card.rows)).toEqual([copyEn.rows.certifiedFor])
    expect(card.actions.items[0].href).toMatch(
      /\/additional-details\?change=1$/
    )
  })

  it('Should offer no Change link on a read-only review', () => {
    const card = additionalAnimalDetailsCard(
      JOURNEY_ID,
      { animalsCertifiedFor: 'slaughter' },
      new Set(['animalsCertifiedFor']),
      true
    )

    expect(card.actions).toBeUndefined()
  })

  const UNWEANED_ANSWERS = {
    commodityLines: [{ commoditySelection: 'Cow' }],
    containsUnweanedAnimals: 'no'
  }

  it('Should show the card without a Change link when the page is not in the journey', () => {
    const card = additionalAnimalDetailsCard(
      JOURNEY_ID,
      UNWEANED_ANSWERS,
      new Set(),
      false
    )

    expect(card).not.toBeNull()
    expect(card.rows.length).toBeGreaterThanOrEqual(1)
    expect(card.actions).toBeUndefined()
  })

  it('Should offer a Change link when only the unweaned answer puts the page in the journey', () => {
    const card = additionalAnimalDetailsCard(
      JOURNEY_ID,
      UNWEANED_ANSWERS,
      new Set(['containsUnweanedAnimals']),
      false
    )

    expect(card.actions.items[0].href).toMatch(
      /\/additional-details\?change=1$/
    )
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
    privateTransporter: { name: PRIVATE_TRANSPORTER_NAME }
  }

  it('Should keep the region-of-origin-code row when the requirement is no', async () => {
    expect(keysOf(rowsOf(await sectionsFor(gatedOffSeed)))).toContain(
      REGION_CODE_KEY
    )
  })

  it('Should read Not applicable for the region of origin code when none was needed, whatever is stored', async () => {
    const card = cardByTitle(
      await sectionsFor({
        ...fullSeed,
        regionOfOriginCodeRequirement: 'no',
        regionOfOriginCode: 'FR-75'
      }),
      IMPORT_DETAILS_CARD
    )

    expect(card.error).toBeNull()
    expect(valueOf(card.rows, REGION_CODE_KEY)).toBe(NOT_APPLICABLE)
  })

  it('Should omit the internal-market purpose row when the reason is not internalMarket', async () => {
    expect(keysOf(rowsOf(await sectionsFor(gatedOffSeed)))).not.toContain(
      PURPOSE_IN_MARKET_KEY
    )
  })

  it('Should omit the unweaned row when no line is an eligible commodity', async () => {
    const keys = keysOf(rowsOf(await sectionsFor(gatedOffSeed)))
    expect(keys).not.toContain(UNWEANED_KEY)
  })

  // CPH is the opposite shape: design release 1 asks every consignment for one
  // and exempts named commodity codes, so the row goes away only on an exempt
  // line — 0101 here. This block's own Fish line is asked for a CPH number.
  it('Should omit the CPH row for an exempt commodity', async () => {
    const keys = keysOf(
      rowsOf(
        await sectionsFor({
          ...gatedOffSeed,
          commodityLines: [{ commoditySelection: 'Horse' }]
        })
      )
    )
    expect(keys).not.toContain(CPH_KEY)
  })

  it('Should omit the packages row when the commodity is off the package-count list', async () => {
    const card = cardByTitle(await sectionsFor(gatedOffSeed), FISH_CARD_TITLE)
    expect(keysOf(blockRowsOf(card))).not.toContain(PACKAGES_KEY)
    expect(card.speciesBlocks[0].heading).toBe('Fish')
  })

  it('Should omit the transited-countries row for a non-overland means of transport', async () => {
    expect(keysOf(rowsOf(await sectionsFor(gatedOffSeed)))).not.toContain(
      TRANSITED_COUNTRIES_KEY
    )
  })

  it("Should always show the five transporter rows, with Not applicable for a private transporter's approval number", async () => {
    const privateSeed = {
      ...fullSeed,
      transporterType: 'Private',
      privateTransporter: {
        name: PRIVATE_TRANSPORTER_NAME,
        address: { addressLine1: '1 Rue de Paris', country: 'France' }
      }
    }
    delete privateSeed.commercialTransporter
    const view = await viewForStatus(SUBMITTED, privateSeed)
    const card = cardByTitle(view.context.sections, TRANSPORT_DETAILS_CARD)

    expect(keysOf(card.rows)).toEqual([
      'Name',
      'Address',
      'Country',
      APPROVAL_NUMBER_KEY,
      'Type'
    ])
    expect(valueOf(card.rows, 'Name')).toBe(PRIVATE_TRANSPORTER_NAME)
    expect(valueOf(card.rows, APPROVAL_NUMBER_KEY)).toBe(NOT_APPLICABLE)
    expect(valueOf(card.rows, 'Country')).toBe('France')
    expect(valueOf(card.rows, 'Type')).toBe('Private')
  })

  it('Should show the five transporter rows before a transporter is chosen', async () => {
    const card = cardByTitle(await sectionsFor({}), TRANSPORT_DETAILS_CARD)

    expect(keysOf(card.rows)).toEqual([
      'Name',
      'Address',
      'Country',
      APPROVAL_NUMBER_KEY,
      'Type'
    ])
  })

  it('Should omit the identifier table when the commodity holds no entry', async () => {
    const sections = await sectionsFor(gatedOffSeed)
    expect(
      cardByTitle(sections, FISH_CARD_TITLE).speciesBlocks[0].identifierTable
    ).toBeNull()
  })

  // Documents are optional, so an empty collection is the ordinary case. The
  // section and its card stand anyway, or the review never mentions documents
  // and the trader has no route to the upload page from it.
  it('Should stand a single Document 1 card reading Not applicable when nothing has been uploaded', async () => {
    const sections = await sectionsFor(gatedOffSeed)
    expect(sections.map((section) => section.heading)).toContain(
      '4. Uploaded documents'
    )
    const documentCards = sections.find(
      (section) => section.anchor === DOCUMENTS_SECTION_ANCHOR
    ).cards
    expect(documentCards.map((card) => card.title)).toEqual([DOCUMENT_1_CARD])
    const [card] = documentCards
    expect(keysOf(card.rows)).toEqual([DOCUMENT_REFERENCE_KEY])
    expect(valueOf(card.rows, DOCUMENT_REFERENCE_KEY)).toBe(NOT_APPLICABLE)
    expect(JSON.stringify(sections)).not.toContain(NO_DOCUMENTS_SENTENCE)
  })

  it('Should still offer the Change route to the documents page when nothing has been uploaded', async () => {
    const card = cardByTitle(await sectionsFor(gatedOffSeed), DOCUMENT_1_CARD)
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
      htmlOf(rowsOf(await sectionsFor(gatedOffSeed)), ARRIVAL_DATE_KEY)
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

  // A part-filled document leaves the documents task row in progress, which
  // is what marks the card.
  it('Should mark the blank rows inside an unfinished documents card missing', async () => {
    const sections = await sectionsFor({
      ...fullSeed,
      documents: [{ accompanyingDocumentType: 'VETERINARY_HEALTH_CERTIFICATE' }]
    })
    const card = cardByTitle(sections, DOCUMENT_1_CARD)

    expect(card.error).toBe(DOCUMENTS_INCOMPLETE)
    expect(htmlOf(card.rows, DOCUMENT_REFERENCE_KEY)).toBe(MISSING_HTML)
    expect(htmlOf(card.rows, DATE_OF_ISSUE_KEY)).toBe(MISSING_HTML)
    expect(htmlOf(card.rows, ATTACHMENT_KEY)).toBe(MISSING_HTML)
    expect(valueOf(card.rows, DOCUMENT_TYPE_KEY)).toBe(
      'Veterinary health certificate'
    )
  })

  it('Should anchor and name only the first document card while documents are unfinished, and mark the blank rows of every document card missing', async () => {
    const seed = {
      ...fullSeed,
      documents: [
        fullSeed.documents[0],
        { accompanyingDocumentType: 'AIR_WAYBILL' }
      ]
    }
    const sections = await sectionsFor(seed)
    const first = cardByTitle(sections, DOCUMENT_1_CARD)
    const second = cardByTitle(sections, DOCUMENT_2_CARD)

    expect(first.anchor).toBe('documents')
    expect(first.error).toBe(DOCUMENTS_INCOMPLETE)
    expect(second.anchor).toBeUndefined()
    expect(second.error).toBeNull()
    expect(htmlOf(second.rows, DOCUMENT_REFERENCE_KEY)).toBe(MISSING_HTML)
    expect(htmlOf(second.rows, DATE_OF_ISSUE_KEY)).toBe(MISSING_HTML)
    expect(htmlOf(second.rows, ATTACHMENT_KEY)).toBe(MISSING_HTML)
    const summary = await summaryFor(seed)
    expect(
      summary.errorList.find((entry) => entry.text === DOCUMENTS_INCOMPLETE)
        .href
    ).toBe('#documents')
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

  it('Should show the exit border control post and then the destination country for a transit, with no port of exit row', async () => {
    const card = cardByTitle(
      await sectionsFor(
        reasonSeed({
          reasonForImport: 'transit',
          destinationCountry: 'IE',
          portOfExit: 'GB DVR'
        })
      ),
      REASON_FOR_IMPORT_CARD
    )

    expect(keysOf(card.rows)).toEqual([
      MAIN_IMPORT_REASON_KEY,
      EXIT_BCP_KEY,
      DESTINATION_COUNTRY_KEY
    ])
    expect(valueOf(card.rows, EXIT_BCP_KEY)).toBe('Port of Dover (GB DVR)')
    expect(valueOf(card.rows, DESTINATION_COUNTRY_KEY)).toBe('Ireland')
    expect(keysOf(card.rows)).not.toContain(PORT_OF_EXIT_KEY)
  })

  it('Should name a subdivision destination country with its parent country', async () => {
    const rows = rowsOf(
      await sectionsFor(
        reasonSeed({
          reasonForImport: 'transhipmentOrOnwardTravel',
          destinationCountry: 'FR-MQ'
        })
      )
    )

    expect(valueOf(rows, DESTINATION_COUNTRY_KEY)).toBe('Martinique (France)')
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
    expect(keys).not.toContain(EXIT_BCP_KEY)
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
    expect(card.rows.flatMap((entry) => entry.actions?.items ?? [])).toEqual([])
    expect(cardChangeHrefOf(sections, REASON_FOR_IMPORT_CARD)).toMatch(
      /\/import-reason\?change=1$/
    )
  })
})

describe(`${SUITE} — copied party addresses`, () => {
  setupCheckAnswersEngine()

  it('Should render the name and address held on the copy', async () => {
    const card = cardByTitle(
      await sectionsFor({ consignor: copyOf(CONSIGNOR_ADDRESS_ID) }),
      ROLES_AND_ADDRESSES_CARD
    )

    expect(htmlOf(card.rows, 'Consignor')).toContain(CONSIGNOR_NAME)
    expect(htmlOf(card.rows, 'Consignor')).toContain(ADDRESS_LINE_1)
  })

  it('Should show the error above a copy that breaks the rules, keeping its details visible', async () => {
    const card = cardByTitle(
      await sectionsFor({ consignor: BROKEN_COPY }),
      ROLES_AND_ADDRESSES_CARD
    )
    const html = htmlOf(card.rows, 'Consignor')

    expect(html).toContain(CONSIGNOR_ERROR)
    expect(html).toContain('govuk-error-message')
    expect(html).toContain(BROKEN_COPY.name)
  })

  it('Should name a copy refused only for its contact details, showing its address but neither telephone nor email', async () => {
    const badEmail = {
      ...copyOf(CONSIGNOR_ADDRESS_ID),
      phone: '+44 7700 900123',
      email: 'not-an-email'
    }
    const card = cardByTitle(
      await sectionsFor({ consignor: badEmail }),
      ROLES_AND_ADDRESSES_CARD
    )
    const html = htmlOf(card.rows, 'Consignor')

    expect(html).toContain(CONSIGNOR_ERROR)
    expect(html).toContain(CONSIGNOR_NAME)
    expect(html).toContain(ADDRESS_LINE_1)
    expect(html).not.toContain('+44 7700 900123')
    expect(html).not.toContain('not-an-email')
  })

  it('Should give each copied role a link to edit its details, returning here', async () => {
    const { view, journeyId } = await driveHandler(getHandler, {
      seed: fullSeed
    })
    const card = cardByTitle(view.context.sections, ROLES_AND_ADDRESSES_CARD)
    const consignorRow = card.rows.find((row) => row.key.text === 'Consignor')

    expect(consignorRow.actions.items).toEqual([
      {
        href: `${pagePath(journeyId, 'consignors/edit')}?return=notification-view`,
        text: 'Edit details',
        visuallyHiddenText: 'consignor'
      }
    ])
  })

  it('Should give the contact address a link to edit its details too', async () => {
    const { view, journeyId } = await driveHandler(getHandler, {
      seed: fullSeed
    })
    const card = cardByTitle(view.context.sections, CONTACT_ADDRESS_CARD)

    expect(card.rows[0].actions.items[0].href).toBe(
      `${pagePath(journeyId, 'consignment/contact/edit')}?return=notification-view`
    )
  })

  it('Should give a role never answered no edit link', async () => {
    const card = cardByTitle(
      await sectionsFor(withoutParty(fullSeed, 'importer')),
      ROLES_AND_ADDRESSES_CARD
    )
    const importerRow = card.rows.find((row) => row.key.text === 'Importer')

    expect(importerRow.actions).toBeUndefined()
  })

  it('Should offer no edit links on a submitted notification', async () => {
    const { context } = await viewForStatus(SUBMITTED, fullSeed)
    const card = cardByTitle(context.sections, ROLES_AND_ADDRESSES_CARD)

    expect(card.rows.every((row) => row.actions === undefined)).toBe(true)
  })

  it('Should render the copy for every status, never consulting the address book', async () => {
    const partySpy = vi.spyOn(addressBook, 'party')
    try {
      for (const status of [DRAFT, AMEND, SUBMITTED]) {
        const { context } = await viewForStatus(status, fullSeed)
        const card = cardByTitle(context.sections, ROLES_AND_ADDRESSES_CARD)
        expect(htmlOf(card.rows, 'Consignor')).toContain(CONSIGNOR_NAME)
      }
      expect(partySpy).not.toHaveBeenCalled()
    } finally {
      partySpy.mockRestore()
    }
  })
})

describe(`${SUITE} — roles whose copy breaks the rules`, () => {
  setupCheckAnswersEngine()

  it('Should list every role in error in the error summary', async () => {
    const summary = await summaryFor({
      ...fullSeed,
      consignor: BROKEN_COPY,
      importer: BROKEN_COPY
    })

    expect(summary.errorList.map((entry) => entry.text)).toEqual([
      CONSIGNOR_ERROR,
      'Correct the address details for the importer'
    ])
  })

  it('Should name a contact address that breaks the rules', async () => {
    const summary = await summaryFor({
      ...fullSeed,
      contactAddress: BROKEN_COPY
    })

    expect(summary.errorList.map((entry) => entry.text)).toEqual([
      CONTACT_ERROR
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

  it('Should link each summary entry to the page that edits that address', async () => {
    const { view, journeyId } = await driveHandler(getHandler, {
      seed: { ...fullSeed, consignor: BROKEN_COPY }
    })

    expect(view.context.errorSummary.errorList[0].href).toBe(
      `${pagePath(journeyId, 'consignors/edit')}?return=notification-view`
    )
  })

  it('Should link a contact address in error to its edit page, not its card', async () => {
    const { view, journeyId } = await driveHandler(getHandler, {
      seed: { ...fullSeed, contactAddress: BROKEN_COPY }
    })

    expect(view.context.errorSummary.errorList).toEqual([
      {
        text: CONTACT_ERROR,
        href: `${pagePath(journeyId, 'consignment/contact/edit')}?return=notification-view`
      }
    ])
    const card = cardByTitle(view.context.sections, CONTACT_ADDRESS_CARD)
    expect(card.rows[0].value.html).toContain(CONTACT_ERROR)
  })

  it('Should leave focus where it is when the page is merely visited', async () => {
    const summary = await summaryFor({
      ...fullSeed,
      consignor: BROKEN_COPY
    })

    expect(summary.disableAutoFocus).toBe(true)
  })

  it('Should carry no error summary once every copy meets the rules', async () => {
    expect(await summaryFor(fullSeed)).toBeNull()
  })

  it('Should flag a place of origin that breaks the rules like any other role', async () => {
    const summary = await summaryFor({
      ...fullSeed,
      placeOfOrigin: BROKEN_COPY
    })

    expect(summary.errorList.map((entry) => entry.text)).toContain(
      'Correct the address details for the place of origin'
    )
  })

  it('Should not flag a submitted notification', async () => {
    const { context } = await viewForStatus(SUBMITTED, {
      ...fullSeed,
      consignor: BROKEN_COPY
    })
    expect(context.errorSummary).toBeNull()
  })

  it('Should hold an amend without naming a role in error', async () => {
    const { context } = await viewForStatus(AMEND, {
      ...fullSeed,
      consignor: BROKEN_COPY
    })
    expect(context.errorSummary).toBeNull()
    expect(cardsOf(context.sections).filter((card) => card.error)).toEqual([])
  })

  it('Should show no error summary or card error on an incomplete amend review', async () => {
    const { arrivalDateAtPort, ...withoutArrivalDate } = fullSeed
    expect(arrivalDateAtPort).toBeDefined()

    const { context } = await viewForStatus(AMEND, withoutArrivalDate)

    expect(context.errorSummary).toBeNull()
    expect(cardsOf(context.sections).filter((card) => card.error)).toEqual([])
  })

  it('Should show no error summary or card error when the arrival date is more than 6 months ahead', async () => {
    const { context } = await viewForStatus(AMEND, {
      ...fullSeed,
      arrivalDateAtPort: dateMonthsAhead(8)
    })

    expect(context.errorSummary).toBeNull()
    expect(cardsOf(context.sections).filter((card) => card.error)).toEqual([])
  })
})

describe(`${SUITE} — Continue on an amend review`, () => {
  setupCheckAnswersEngine()

  const amendJourney = async (seed) => {
    const journey = await store.create()
    await store.seedAnswers(journey.journeyId, seed)
    await store.submit(journey.journeyId)
    await records.amend(journey.journeyId)
    return journey
  }

  it('Should refuse an incomplete amend with the summary naming the arrival details', async () => {
    const { arrivalDateAtPort, ...withoutArrivalDate } = fullSeed
    expect(arrivalDateAtPort).toBeDefined()
    const journey = await amendJourney(withoutArrivalDate)
    const h = stubH()

    const response = await postHandler(journeyRequest(journey.journeyId), h)

    expect(response.statusCode).toBe(400)
    expect(response.redirect).toBeUndefined()
    expect(
      h.captured.view.context.errorSummary.errorList.map((item) => item.text)
    ).toContain(ARRIVAL_DETAILS_INCOMPLETE)
    expect((await store.get(journey.journeyId)).status).toBe(AMEND)
  })

  it('Should refuse an amend whose arrival date is more than 6 months ahead with the summary', async () => {
    const journey = await amendJourney({
      ...fullSeed,
      arrivalDateAtPort: dateMonthsAhead(8)
    })
    const h = stubH()

    const response = await postHandler(journeyRequest(journey.journeyId), h)

    expect(response.statusCode).toBe(400)
    expect(response.redirect).toBeUndefined()
    expect(
      h.captured.view.context.errorSummary.errorList.length
    ).toBeGreaterThan(0)
    expect((await store.get(journey.journeyId)).status).toBe(AMEND)
  })

  it('Should still refuse an incomplete draft with the summary', async () => {
    const { arrivalDateAtPort, ...withoutArrivalDate } = fullSeed
    expect(arrivalDateAtPort).toBeDefined()
    const { response, view } = await driveHandler(postHandler, {
      seed: withoutArrivalDate
    })

    expect(response.statusCode).toBe(400)
    expect(view.context.errorSummary.errorList.length).toBeGreaterThan(0)
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
      packages: keysOf(blockRowsOf(speciesCard)).includes(PACKAGES_KEY),
      unweaned: allKeys.includes(UNWEANED_KEY),
      cph: allKeys.includes(CPH_KEY)
    }
  }

  // CPH runs the other way round from the other two gates: design release 1
  // asks every consignment for a CPH number and exempts named commodity codes,
  // so the false rows below are the exemptions — 0101 for Horse and 01061900
  // for Cat and Dog, which is asked for a permanent address instead.
  const MATRIX = [
    { commodity: 'Cow', packages: true, unweaned: true, cph: true },
    // Design release 1 asks the unweaned-animals question only of a commodity
    // carrying unweaned options, and a horse carries none.
    { commodity: 'Horse', packages: true, unweaned: false, cph: false },
    { commodity: 'Cat', packages: true, unweaned: false, cph: false },
    { commodity: 'Dog', packages: true, unweaned: false, cph: false },
    { commodity: 'Fish', packages: false, unweaned: false, cph: true }
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

  it('Should redirect to the declaration when an overland notification lists no transit countries', async () => {
    const seed = { ...fullSeed, transitedCountries: [] }
    const { response } = await driveHandler(postHandler, { seed })

    expect(response.redirect).toMatch(/\/declaration$/)
    expect(await summaryFor(seed)).toBeNull()
  })

  it('Should refuse Continue while a referenced role is outstanding', async () => {
    const { response } = await driveHandler(postHandler, {
      seed: { ...fullSeed, consignor: BROKEN_COPY }
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
      seed: { ...fullSeed, consignor: BROKEN_COPY }
    })

    expect(view.context.errorSummary.errorList[0].text).toBe(CONSIGNOR_ERROR)
  })

  it('Should move focus to the summary when Continue is refused', async () => {
    const { view } = await driveHandler(postHandler, {
      seed: { ...fullSeed, consignor: BROKEN_COPY }
    })

    expect(view.context.errorSummary.disableAutoFocus).toBe(false)
  })

  it('Should not refuse a submitted notification carrying a deleted address', async () => {
    const journey = await store.create()
    await store.seedAnswers(journey.journeyId, {
      ...fullSeed,
      consignor: BROKEN_COPY
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
      WHAT_ARE_YOU_IMPORTING_INCOMPLETE,
      'Complete main import reason',
      COMMODITY_DETAILS_INCOMPLETE,
      'Complete additional details',
      ARRIVAL_DETAILS_INCOMPLETE,
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
    expect(texts).not.toContain(ARRIVAL_DETAILS_INCOMPLETE)
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

  // The one summary anchor that can be the section heading's own id: with no
  // commodity card standing, the commodity details entry falls back to the
  // heading. The two literals live in different modules, so they have to be
  // checked against each other.
  it('Should link Complete commodity details to the section heading while no commodity card stands', async () => {
    const { view } = await driveHandler(getHandler, { seed: {} })
    const entry = view.context.errorSummary.errorList.find(
      (item) => item.text === COMMODITY_DETAILS_INCOMPLETE
    )

    expect(entry.href).toBe('#description-of-the-goods')
    expect(
      view.context.sections.some(
        (section) => section.anchor === DESCRIPTION_ANCHOR
      )
    ).toBe(true)
  })

  // DOCUMENTED EXCEPTION, not an oversight: commodity cards carry no id, so
  // `decorateCard` never marks them. The summary still names the outstanding
  // work and links to the first commodity card.
  it('Should name commodity details in the summary while leaving every commodity card unmarked', async () => {
    // Two lines, the second barely started: the commodity card is built, and
    // the consignment details rows stay outstanding.
    const seed = {
      commodityLines: [
        fullSeed.commodityLines[0],
        { commoditySelection: 'Cow' }
      ]
    }

    expect(await textsFor(seed)).toContain(COMMODITY_DETAILS_INCOMPLETE)

    const sections = await sectionsFor(seed)
    const descriptionCards = sections
      .find((section) => section.anchor === DESCRIPTION_ANCHOR)
      .cards.filter((card) => card.title !== ADDITIONAL_ANIMAL_DETAILS_CARD)

    expect(descriptionCards.length).toBeGreaterThan(0)
    for (const card of descriptionCards) {
      expect(card.error, card.title).toBeUndefined()
    }
  })

  // The card `id` literals are the only join between the built cards and
  // REVIEW_CARDS, and `decorateCard` fails silently on a miss: the summary would
  // still emit "Complete <card>" with an href pointing at nothing.
  // `commodityDetails` is the deliberate exception: it links to a commodity
  // card, which has no id.
  it('Should build a card for every REVIEW_CARDS entry that anchors to one', async () => {
    // A fully-populated seed rather than an empty draft, so every card stands.
    const sections = await sectionsFor(fullSeed)
    const builtIds = cardsOf(sections).map((card) => card.id)
    const anchoredIds = REVIEW_CARDS.filter(
      (card) => card.id !== 'commodityDetails'
    ).map((card) => card.id)

    expect(builtIds).toEqual(expect.arrayContaining(anchoredIds))
  })

  // Every summary entry points at a card or section the page always carries:
  // the transit task row folds into arrival details, so no entry names a card
  // that is built only conditionally.
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

// The review page re-runs each page's own validation over what is stored, so
// an answer the reference data has since retired is named here rather than
// surviving unnoticed to submission — the same message the port-of-entry page
// itself gives on GET (`port-of-entry.controller.test.js`). `GB ZZZ` is absent
// from the captured ports fixture, so it doubles as a stale stored code.
describe(`${SUITE} — stale stored answers`, () => {
  setupCheckAnswersEngine()

  const STALE_PORT = 'GB ZZZ'
  const staleMessage = transportCopy.portOfEntry.errors.portNoLongerAvailable
  const staleSeed = { ...fullSeed, portOfEntry: STALE_PORT }

  it('Should name the arrival-details card when its stored port is no longer offered', async () => {
    const card = cardByTitle(await sectionsFor(staleSeed), ARRIVAL_DETAILS_CARD)

    expect(card.error).toBe(staleMessage)
  })

  it('Should list the stale answer in the error summary, anchored to its card', async () => {
    const summary = await summaryFor(staleSeed)

    expect(summary.errorList).toContainEqual({
      text: staleMessage,
      href: '#arrival-details'
    })
  })

  // Incomplete wins over invalid on the same card: a card that is both
  // unfinished and carrying a stale value says "complete this section", not
  // the stale answer's own message.
  it('Should show the unfinished message, not the stale one, when the same card is also incomplete', async () => {
    const seed = { ...staleSeed }
    delete seed.meansOfTransport
    const card = cardByTitle(await sectionsFor(seed), ARRIVAL_DETAILS_CARD)

    expect(card.error).toBe(ARRIVAL_DETAILS_INCOMPLETE)
  })

  it('Should refuse Continue on an otherwise-complete notification carrying a stale stored answer', async () => {
    const { response } = await driveHandler(postHandler, { seed: staleSeed })

    expect(response.redirect).toBeUndefined()
    expect(response.statusCode).toBe(400)
  })

  it('Should show neither a card error nor a summary entry for a stale answer on a submitted notification', async () => {
    const { context } = await viewForStatus(SUBMITTED, staleSeed)
    const card = cardByTitle(context.sections, ARRIVAL_DETAILS_CARD)

    expect(card.error).toBeNull()
    expect(context.errorSummary).toBeNull()
  })
})

// Document scan verdicts are threaded onto the uploaded-documents card
// through two paths that renderNotificationView wires up separately: the GET
// path names a REJECTED scan (a permanent verdict on a stored file), and the
// POST refuse path additionally names a PENDING scan (a mid-upload) via
// extraCardErrors. Neither is exercised by the pure-function refusal tests —
// those hit the helpers, not the controller's spread order or option
// threading, so this block pins the controller-level wiring.
describe(`${SUITE} — document scan card errors`, () => {
  setupCheckAnswersEngine()

  // Stub-driven scan verdicts: filename matches the stub's rules —
  // `virus-*` → REJECTED, `*never-scans*` → PENDING, otherwise → COMPLETED.
  const REJECTED_FILENAME = 'virus-alert.pdf'
  const PENDING_FILENAME = 'notes-never-scans.pdf'

  const scanDoc = (overrides = {}) => ({
    accompanyingDocumentType: 'VETERINARY_HEALTH_CERTIFICATE',
    accompanyingDocumentAttachmentType: 'PDF',
    accompanyingDocumentReference: 'GBHC1234567890',
    accompanyingDocumentDateOfIssue: { day: '12', month: '12', year: '2025' },
    uploadId: 'upload-1',
    filename: 'clean.pdf',
    ...overrides
  })

  const seedWithDoc = (filename) => ({
    ...fullSeed,
    documents: [scanDoc({ filename })]
  })

  // The GET path renders documentsRejectedCardErrors on the docs card, but
  // only for a REJECTED scan — a PENDING is transient so must not surface.
  it('Should name the first document card when a stored document was rejected by the scan', async () => {
    const card = cardByTitle(
      await sectionsFor(seedWithDoc(REJECTED_FILENAME)),
      DOCUMENT_1_CARD
    )

    expect(card.error).toBe(documentsEn.errors.someRejected)
  })

  it('Should not name the first document card for a still-scanning document on GET', async () => {
    const card = cardByTitle(
      await sectionsFor(seedWithDoc(PENDING_FILENAME)),
      DOCUMENT_1_CARD
    )

    expect(card.error).toBeNull()
  })

  // The POST refuse path threads extraCardErrors (documentScanCardErrors)
  // through to the docs card, so a still-scanning document is named when
  // Continue is refused — not on the read path, only on the write.
  it('Should name the first document card as still scanning when Continue is refused with a pending document', async () => {
    const { view, response } = await driveHandler(postHandler, {
      seed: seedWithDoc(PENDING_FILENAME)
    })
    const card = cardByTitle(view.context.sections, DOCUMENT_1_CARD)

    expect(response.statusCode).toBe(400)
    expect(card.error).toBe(documentsEn.errors.someStillScanning)
  })

  // On a rejected document, the docs card already carries the REJECTED
  // verdict from the GET-path errors — the POST refuse path must not
  // overwrite it with a still-scanning message, since a rejected file
  // trumps a pending one.
  it('Should keep the rejected message on the first document card when Continue is refused with a rejected document', async () => {
    const { view, response } = await driveHandler(postHandler, {
      seed: seedWithDoc(REJECTED_FILENAME)
    })
    const card = cardByTitle(view.context.sections, DOCUMENT_1_CARD)

    expect(response.statusCode).toBe(400)
    expect(card.error).toBe(documentsEn.errors.someRejected)
  })

  // A read-only submitted notification never carries a scan error — the
  // errors are gated on the read path by the readOnly branch.
  it('Should not carry any scan card error on a submitted notification', async () => {
    const { context } = await viewForStatus(
      SUBMITTED,
      seedWithDoc(REJECTED_FILENAME)
    )
    const card = cardByTitle(context.sections, DOCUMENT_1_CARD)

    expect(card.error).toBeNull()
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

const line = (commoditySelection, speciesSelection, extra = {}) => ({
  commoditySelection,
  speciesSelection,
  numberOfAnimalsQuantity: '2',
  numberOfPackages: '1',
  ...extra
})

describe(`${SUITE} — what are you importing`, () => {
  setupCheckAnswersEngine()

  const cardFor = async (seed) =>
    cardByTitle(await sectionsFor(seed), WHAT_ARE_YOU_IMPORTING_CARD)

  it('Should read the commodity selection back with its code, common name and species', async () => {
    const card = await cardFor(fullSeed)

    expect(keysOf(card.rows)).toEqual([
      COMMODITY_CODE_KEY,
      COMMON_NAME_KEY,
      SPECIES_KEY
    ])
    expect(valueOf(card.rows, COMMODITY_CODE_KEY)).toBe('0102')
    expect(valueOf(card.rows, COMMON_NAME_KEY)).toBe('Cow')
    expect(valueOf(card.rows, SPECIES_KEY)).toBe(BOS_TAURUS)
  })

  it('Should link the card to the commodity selection page with a hidden name', async () => {
    const card = await cardFor(fullSeed)

    expect(card.actions.items).toHaveLength(1)
    expect(card.actions.items[0].href).toMatch(/\/commodities\?change=1$/)
    expect(card.actions.items[0].visuallyHiddenText).toBe(
      'what are you importing'
    )
  })

  it('Should read each commodity once and every species in title case', async () => {
    const card = await cardFor({
      ...fullSeed,
      commodityLines: [
        line('Cow', '1148346'),
        line('Cow', '749313'),
        line('Fish', '801204')
      ]
    })

    expect(valueOf(card.rows, COMMODITY_CODE_KEY)).toBe('0102, 0301')
    expect(valueOf(card.rows, COMMON_NAME_KEY)).toBe('Cow, Fish')
    expect(valueOf(card.rows, SPECIES_KEY)).toBe(
      'Bos Taurus, Bubalus Bubalis, Salmo Salar'
    )
  })

  it('Should add the code and common name of each species of a commodity listed individually', async () => {
    const card = await cardFor({
      ...fullSeed,
      commodityLines: [line('Cat', '923501'), line('Dog', '923502')]
    })

    expect(valueOf(card.rows, COMMODITY_CODE_KEY)).toBe('01061900, 01061900')
    expect(valueOf(card.rows, COMMON_NAME_KEY)).toBe('Cat, Dog')
    expect(valueOf(card.rows, SPECIES_KEY)).toBe(
      'Felis Catus, Canis Lupus Familiaris'
    )
  })

  it('Should mark the card unfinished and name it in the summary while nothing is chosen', async () => {
    const seed = { ...fullSeed, commodityLines: [] }
    const card = await cardFor(seed)
    const summary = await summaryFor(seed)

    expect(card.error).toBe(WHAT_ARE_YOU_IMPORTING_INCOMPLETE)
    expect(card.anchor).toBe('what-are-you-importing')
    expect(card.rows.map((entry) => entry.value.html)).toEqual([
      MISSING_HTML,
      MISSING_HTML,
      MISSING_HTML
    ])
    expect(summary.errorList).toContainEqual({
      text: WHAT_ARE_YOU_IMPORTING_INCOMPLETE,
      href: '#what-are-you-importing'
    })
  })

  it('Should omit the Change link on a submitted review', async () => {
    const view = await viewForStatus(SUBMITTED)

    expect(
      cardByTitle(view.context.sections, WHAT_ARE_YOU_IMPORTING_CARD).actions
    ).toBeUndefined()
  })
})

describe(`${SUITE} — commodity cards`, () => {
  setupCheckAnswersEngine()

  const twoCowsAndFish = {
    ...fullSeed,
    commodityLines: [
      line('Cow', '1148346'),
      line('Cow', '749313'),
      line('Fish', '801204')
    ]
  }

  it('Should build one card per commodity with a block per species', async () => {
    const sections = await sectionsFor(twoCowsAndFish)
    const cow = cardByTitle(sections, COW_CARD_TITLE)
    const fish = cardByTitle(sections, FISH_CARD_TITLE)

    expect(cow.speciesBlocks.map((block) => block.heading)).toEqual([
      BOS_TAURUS,
      'Bubalus Bubalis'
    ])
    expect(fish.speciesBlocks.map((block) => block.heading)).toEqual([
      'Salmo Salar'
    ])
    expect(cow.actions.items[0].href).toMatch(
      /\/consignment-details\?change=1$/
    )
    expect(fish.actions.items[0].href).toMatch(
      /\/consignment-details\?change=1$/
    )
  })

  it('Should keep commodities that share a code on separate cards', async () => {
    const sections = await sectionsFor({
      ...fullSeed,
      commodityLines: [line('Cat', '923501'), line('Dog', '923502')]
    })

    expect(cardsOf(sections).map((card) => card.title)).toEqual(
      expect.arrayContaining(['Cat (01061900)', 'Dog (01061900)'])
    )
  })

  it('Should give a species block no commodity code, common name or species row', async () => {
    const card = cardByTitle(await sectionsFor(fullSeed), COW_CARD_TITLE)

    for (const block of card.speciesBlocks) {
      expect(keysOf(block.rows)).not.toContain(COMMODITY_CODE_KEY)
      expect(keysOf(block.rows)).not.toContain(COMMON_NAME_KEY)
      expect(keysOf(block.rows)).not.toContain(SPECIES_KEY)
    }
  })

  it('Should read Not applicable for blank packages and leave the card unmarked', async () => {
    const sections = await sectionsFor({
      ...fullSeed,
      commodityLines: [line('Cow', '1148346', { numberOfPackages: '' })]
    })
    const card = cardByTitle(sections, COW_CARD_TITLE)

    expect(valueOf(blockRowsOf(card), PACKAGES_KEY)).toBe(NOT_APPLICABLE)
    expect(card.error).toBeUndefined()
  })

  it('Should give the first row of each block a Change link naming its species', async () => {
    const card = cardByTitle(await sectionsFor(fullSeed), COW_CARD_TITLE)
    const [first, second] = blockOf(card, BOS_TAURUS).rows

    expect(first.actions.items).toHaveLength(1)
    expect(first.actions.items[0].text).toBe('Change')
    expect(first.actions.items[0].href).toMatch(
      /\/consignment-details\?change=1$/
    )
    expect(first.actions.items[0].visuallyHiddenText).toBe(
      'number of animals for Bos Taurus'
    )
    expect(second.actions).toBeUndefined()
  })

  it('Should name commodity details in the summary, link to the first commodity card and mark no commodity card when the numbers are missing', async () => {
    const incompleteLine = { ...fullSeed.commodityLines[0] }
    delete incompleteLine.numberOfAnimalsQuantity
    const seed = { ...fullSeed, commodityLines: [incompleteLine] }
    const sections = await sectionsFor(seed)
    const [first] = sections.find(
      (section) => section.anchor === DESCRIPTION_ANCHOR
    ).cards

    expect((await summaryFor(seed)).errorList).toContainEqual({
      text: COMMODITY_DETAILS_INCOMPLETE,
      href: '#commodity-details'
    })
    expect(first.anchor).toBe('commodity-details')
    expect(first.error).toBeUndefined()
    expect(cardByTitle(sections, WHAT_ARE_YOU_IMPORTING_CARD).error).toBeNull()
  })

  it('Should give Identification details its own Change link to the identification page, naming the species', async () => {
    const card = cardByTitle(await sectionsFor(fullSeed), COW_CARD_TITLE)
    const { items } = blockOf(card, BOS_TAURUS).identifierTable.actions

    expect(items).toHaveLength(1)
    expect(items[0].text).toBe('Change')
    expect(items[0].href).toMatch(/\/commodities\/identification\?change=1$/)
    expect(items[0].visuallyHiddenText).toBe(
      'identification details for Bos Taurus'
    )
  })

  it('Should offer no Identification details Change link on a submitted review', async () => {
    const view = await viewForStatus(SUBMITTED)
    const card = cardByTitle(view.context.sections, COW_CARD_TITLE)

    expect(blockOf(card, BOS_TAURUS).identifierTable.actions).toBeUndefined()
  })

  it('Should give a column to every identifier the commodity asks for, reading Not applicable where none was given', async () => {
    const card = cardByTitle(
      await sectionsFor({
        ...fullSeed,
        commodityLines: [
          line('Cow', '1148346', {
            animalIdentifiers: [{ animalIdentifierEarTag: 'UK1' }]
          })
        ]
      }),
      COW_CARD_TITLE
    )
    const { identifierTable } = blockOf(card, BOS_TAURUS)

    expect(identifierTable.head.map((cell) => cell.text)).toEqual([
      'Animal',
      'Ear tag',
      'Passport'
    ])
    expect(identifierTable.rows[0].map((cell) => cell.text)).toEqual([
      'Bos taurus 1',
      'UK1',
      NOT_APPLICABLE
    ])
  })

  it('Should label an animal by number alone on a line with no species', async () => {
    const card = cardByTitle(
      await sectionsFor({
        ...fullSeed,
        commodityLines: [
          {
            commoditySelection: 'Cow',
            numberOfAnimalsQuantity: '1',
            numberOfPackages: '1',
            animalIdentifiers: [{ animalIdentifierEarTag: 'UK1' }]
          }
        ]
      }),
      COW_CARD_TITLE
    )

    expect(card.speciesBlocks[0].identifierTable.rows[0][0].text).toBe(
      'Animal 1'
    )
  })

  it('Should anchor each species block by its line', async () => {
    const sections = await sectionsFor(twoCowsAndFish)
    const anchorsOf = (title) =>
      cardByTitle(sections, title).speciesBlocks.map((block) => block.anchor)

    expect(anchorsOf(COW_CARD_TITLE)).toEqual(['species-1', 'species-2'])
    expect(anchorsOf(FISH_CARD_TITLE)).toEqual(['species-3'])
  })

  it('Should resolve a card anchor, falling back only where the page lacks it', () => {
    expect(
      cardAnchorHref('commodityDetails', new Set(['commodity-details']))
    ).toBe('#commodity-details')
    expect(cardAnchorHref('commodityDetails', new Set())).toBe(
      '#description-of-the-goods'
    )
    expect(cardAnchorHref('importDetails')).toBe('#import-details')
    expect(cardAnchorHref('unknown')).toBeUndefined()
  })
})

describe(`${SUITE} — species short of a count or an identifier`, () => {
  setupCheckAnswersEngine()

  const textsFor = async (seed) =>
    (await summaryFor(seed)).errorList.map((entry) => entry.text)
  const entriesFor = async (seed) => (await summaryFor(seed)).errorList
  const countedNoIdsSeed = {
    ...fullSeed,
    commodityLines: [line('Cow', '1148346'), line('Cat', '923501')]
  }

  it('Should name each identified species with no count, in lower case, linking to its block', async () => {
    const entries = await entriesFor({
      ...fullSeed,
      commodityLines: [
        { commoditySelection: 'Cow', speciesSelection: '1148346' },
        { commoditySelection: 'Cat', speciesSelection: '923501' }
      ]
    })

    expect(entries).toContainEqual({
      text: 'Enter the number of animals for bos taurus',
      href: '#species-1'
    })
    expect(entries).toContainEqual({
      text: 'Enter the number of animals for felis catus',
      href: '#species-2'
    })
  })

  it('Should name each counted species with no identifier, linking to its block', async () => {
    const entries = await entriesFor(countedNoIdsSeed)

    expect(entries).toContainEqual({
      text: 'Enter at least 1 animal identifier for bos taurus',
      href: '#species-1'
    })
    expect(entries).toContainEqual({
      text: FELIS_NO_IDENTIFIER,
      href: '#species-2'
    })
  })

  it('Should name only the species still short', async () => {
    const texts = await textsFor({
      ...fullSeed,
      commodityLines: [fullSeed.commodityLines[0], line('Cat', '923501')]
    })

    expect(texts.filter((text) => SPECIES_UNFINISHED.test(text))).toEqual([
      FELIS_NO_IDENTIFIER
    ])
  })

  it('Should name no species when only one carries identifiers', async () => {
    for (const commodityLines of [
      [line('Cow', '1148346')],
      [line('Cow', '1148346'), line('Fish', '801204')]
    ]) {
      const texts = await textsFor({ ...fullSeed, commodityLines })
      expect(texts.some((text) => SPECIES_UNFINISHED.test(text))).toBe(false)
    }
  })

  it('Should list the species entries straight after Complete commodity details', async () => {
    const texts = await textsFor({
      commodityLines: [line('Cow', '1148346'), line('Cat', '923501')]
    })
    const at = texts.indexOf(COMMODITY_DETAILS_INCOMPLETE)

    expect(texts.slice(at, at + 4)).toEqual([
      COMMODITY_DETAILS_INCOMPLETE,
      'Enter at least 1 animal identifier for bos taurus',
      FELIS_NO_IDENTIFIER,
      'Complete additional details'
    ])
  })

  it('Should anchor every species entry to a block the page carries', async () => {
    const driven = await driveHandler(getHandler, { seed: countedNoIdsSeed })
    const anchors = new Set(
      cardsOf(driven.view.context.sections)
        .flatMap((card) => card.speciesBlocks ?? [])
        .map((block) => block.anchor)
    )
    const entries = driven.view.context.errorSummary.errorList.filter((entry) =>
      SPECIES_UNFINISHED.test(entry.text)
    )

    expect(entries).toHaveLength(2)
    for (const entry of entries) {
      expect(anchors.has(entry.href.slice(1))).toBe(true)
    }
  })

  it('Should name no species on a submitted notification', async () => {
    const view = await viewForStatus(SUBMITTED, countedNoIdsSeed)

    expect(view.context.errorSummary).toBeNull()
  })
})
