import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { buildDispatch } from '../../flow/dispatch.js'
import { readyForCheckYourAnswers } from '../../flow/section-status.js'
import { configureReadyForCheckYourAnswers } from '../../engine/read.js'
import { store } from '../../engine/store.js'
import { configureRecords } from '../../engine/persistence/records.js'
import { configureSession } from '../../engine/persistence/session.js'
import { records as recordsStub } from '../../services/persistence/records/stub.js'
import { session as sessionStub } from '../../services/persistence/session/stub.js'
import { driveHandler } from '../../engine/test-support.js'
import { hubPath } from '../../config.js'
import { dispatchPages } from '../../features/index.js'
import * as checkAnswers from './controller.js'

const getHandler = checkAnswers.routes.find(
  (route) => route.method === 'GET'
).handler
const postHandler = checkAnswers.routes.find(
  (route) => route.method === 'POST'
).handler

const sectionsFor = async (seed) =>
  (await driveHandler(getHandler, { seed })).view.context.sections

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
const changeHrefOf = (rows, key) => rowByKey(rows, key)?.actions.items[0].href
const keysOf = (rows) => rows.map((row) => row.key.text)

const fullSeed = {
  countryOfOrigin: 'FR',
  regionOfOriginCodeRequirement: 'yes',
  regionOfOriginCode: 'FR-75',
  internalReferenceNumber: 'Imports456GB',
  commodityLines: [
    {
      commoditySelection: 'Cow',
      typeSelection: 'Domestic',
      speciesSelection: ['1148346'],
      numberOfAnimalsQuantity: '25',
      numberOfPackages: '5',
      animalIdentifiers: [
        {
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
      accompanyingDocumentType: 'ITAHC',
      accompanyingDocumentAttachmentType: 'PDF',
      accompanyingDocumentReference: 'GBHC1234567890',
      accompanyingDocumentDateOfIssue: { day: '12', month: '12', year: '2025' }
    }
  ],
  placeOfOrigin: { name: 'Origin Farm' },
  consignor: {
    name: 'Astra Rosales',
    address: {
      addressLine1: '43 East Hague Extension',
      townOrCity: 'Delectus',
      country: 'Switzerland'
    }
  },
  consignee: { name: 'British Livestock Ltd' },
  importer: { name: 'Import Co UK' },
  placeOfDestination: { name: 'Tech Imports Ltd' },
  countyParishHoldingCph: '123456789',
  portOfEntry: 'GB ABD',
  arrivalDateAtPort: { day: '12', month: '12', year: '2026' },
  meansOfTransport: 'Road Vehicle',
  transportIdentification: 'FR-892-LK',
  transportDocumentReference: 'CMR-2026-884721',
  transitedCountries: ['FR', 'BE'],
  transporterType: 'Commercial',
  commercialTransporter: {
    name: 'García Livestock Transport SL',
    approvalNumber: 'ES-T2-45001294',
    address: {
      addressLine1: '43 East Hague Extension',
      country: 'Switzerland'
    }
  },
  contactAddress: { name: 'Animal and Plant Health Agency' }
}

describe('#buildSections (check-answers GET)', () => {
  beforeAll(() => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    buildDispatch(dispatchPages)
    configureReadyForCheckYourAnswers(readyForCheckYourAnswers)
  })
  beforeEach(() => store.clear())

  describe('fully-populated notification', () => {
    it('Should render the numbered design sections in order', async () => {
      const sections = await sectionsFor(fullSeed)
      expect(sections.map((section) => section.heading)).toEqual([
        '1. About the consignment',
        '2. Movement',
        '3. Addresses',
        '4. Documents'
      ])
    })

    it('Should resolve service-backed labels for coded answers', async () => {
      const rows = rowsOf(await sectionsFor(fullSeed))
      expect(valueOf(rows, 'Country of origin')).toBe('France')
      expect(valueOf(rows, 'Reason for import')).toBe('Internal market')
      expect(valueOf(rows, 'Purpose in the market')).toBe('Breeding')
      expect(valueOf(rows, 'Certified for')).toBe('Slaughter')
    })

    it('Should map yes/no coded answers to Yes/No labels', async () => {
      const rows = rowsOf(await sectionsFor(fullSeed))
      expect(valueOf(rows, 'Region of origin code required')).toBe('Yes')
      expect(valueOf(rows, 'Includes unweaned animals')).toBe('No')
    })

    it('Should include the region-of-origin-code row when the requirement is yes', async () => {
      const rows = rowsOf(await sectionsFor(fullSeed))
      expect(valueOf(rows, 'Region of origin code')).toBe('FR-75')
    })

    it('Should include the unweaned row when a line is an unweaned-eligible commodity', async () => {
      expect(keysOf(rowsOf(await sectionsFor(fullSeed)))).toContain(
        'Includes unweaned animals'
      )
    })

    it('Should include the CPH row in the roles-and-addresses card when a line is a CPH-eligible commodity', async () => {
      const card = cardByTitle(
        await sectionsFor(fullSeed),
        'Roles and addresses'
      )
      expect(valueOf(card.rows, 'County Parish Holding number (CPH)')).toBe(
        '123456789'
      )
    })

    it('Should include the transited-countries row for an overland means of transport, labelling each code', async () => {
      const rows = rowsOf(await sectionsFor(fullSeed))
      expect(
        valueOf(rows, 'Countries that the consignment will travel through')
      ).toBe('France, Belgium')
    })

    it('Should expand the commercial transporter in the transport-details card when the type is commercial', async () => {
      const card = cardByTitle(await sectionsFor(fullSeed), 'Transport details')
      expect(valueOf(card.rows, 'Name')).toBe('García Livestock Transport SL')
      expect(htmlOf(card.rows, 'Address')).toBe('43 East Hague Extension')
      expect(valueOf(card.rows, 'Country')).toBe('Switzerland')
      expect(valueOf(card.rows, 'Approval number')).toBe('ES-T2-45001294')
      expect(valueOf(card.rows, 'Type')).toBe('Commercial')
    })

    it('Should render one species card per commodity line with the design rows', async () => {
      const card = cardByTitle(await sectionsFor(fullSeed), 'Cow (0102)')
      expect(valueOf(card.rows, 'Commodity code')).toBe('0102')
      expect(valueOf(card.rows, 'Common name')).toBe('Cow')
      expect(valueOf(card.rows, 'Species')).toBe('Bos taurus')
      expect(valueOf(card.rows, 'Number of animals')).toBe('25')
      expect(valueOf(card.rows, 'Number of packages')).toBe('5')
    })

    it('Should render a read-only identifier table inside the species card', async () => {
      const card = cardByTitle(await sectionsFor(fullSeed), 'Cow (0102)')
      expect(card.identifierTable.head.map((cell) => cell.text)).toEqual([
        'Animal',
        'Passport',
        'Permanent address'
      ])
      expect(card.identifierTable.rows).toEqual([
        [{ text: 'Animal 1' }, { text: 'UK123456789' }, { text: 'Pet Owner' }]
      ])
    })

    it('Should render a document group with the design rows inside the uploaded-documents card', async () => {
      const card = cardByTitle(
        await sectionsFor(fullSeed),
        'Uploaded documents'
      )
      expect(card.documents).toHaveLength(1)
      const [document] = card.documents
      expect(document.heading).toBe('Document 1')
      expect(valueOf(document.rows, 'Document reference')).toBe(
        'GBHC1234567890'
      )
      expect(valueOf(document.rows, 'Document type')).toBe('ITAHC')
      expect(valueOf(document.rows, 'Date of issue')).toBe('12/12/2025')
      expect(valueOf(document.rows, 'Attachment type')).toBe('PDF')
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
        'Roles and addresses'
      )
      expect(htmlOf(card.rows, 'Consignor')).toBe(
        '<strong>Astra Rosales</strong><br>43 East Hague Extension<br>Delectus<br>Switzerland'
      )
      expect(htmlOf(card.rows, 'Place of destination')).toBe(
        '<strong>Tech Imports Ltd</strong>'
      )
      const contact = cardByTitle(
        await sectionsFor(fullSeed),
        'Contact address for this consignment'
      )
      expect(htmlOf(contact.rows, 'Address')).toBe(
        '<strong>Animal and Plant Health Agency</strong>'
      )
    })

    it('Should point each Change link at the owning page slug with a change flag', async () => {
      const rows = rowsOf(await sectionsFor(fullSeed))
      expect(changeHrefOf(rows, 'Country of origin')).toMatch(
        /\/origin\?change=1$/
      )
      expect(changeHrefOf(rows, 'Purpose in the market')).toMatch(
        /\/import-purpose\?change=1$/
      )
      expect(
        changeHrefOf(rows, 'Countries that the consignment will travel through')
      ).toMatch(/\/transit-countries\?change=1$/)
      expect(changeHrefOf(rows, 'Name')).toMatch(
        /\/transporters\/select\?change=1$/
      )
    })

    it('Should point the species-card Change actions at the commodities pages with a change flag', async () => {
      const card = cardByTitle(await sectionsFor(fullSeed), 'Cow (0102)')
      const [commodityAction, identifiersAction] = card.actions.items
      expect(commodityAction.href).toMatch(/\/commodities\?change=1$/)
      expect(identifiersAction.href).toMatch(
        /\/commodities\/0\/identifiers\?change=1$/
      )
    })

    it('Should point the uploaded-documents card Change action at the documents page with a change flag', async () => {
      const card = cardByTitle(
        await sectionsFor(fullSeed),
        'Uploaded documents'
      )
      expect(card.actions.items[0].href).toMatch(
        /\/accompanying-documents\?change=1$/
      )
    })
  })

  describe('gated-off answers and blanks', () => {
    const gatedOffSeed = {
      regionOfOriginCodeRequirement: 'no',
      reasonForImport: 'transit',
      commodityLines: [{ commoditySelection: 'Fish' }],
      meansOfTransport: 'Airplane',
      transporterType: 'Private',
      privateTransporter: { name: 'Jean Dupont' }
    }

    it('Should omit the region-of-origin-code row when the requirement is no', async () => {
      expect(keysOf(rowsOf(await sectionsFor(gatedOffSeed)))).not.toContain(
        'Region of origin code'
      )
    })

    it('Should omit the internal-market purpose row when the reason is not internalMarket', async () => {
      expect(keysOf(rowsOf(await sectionsFor(gatedOffSeed)))).not.toContain(
        'Purpose in the market'
      )
    })

    it('Should omit the unweaned and CPH rows when no line is an eligible commodity', async () => {
      const keys = keysOf(rowsOf(await sectionsFor(gatedOffSeed)))
      expect(keys).not.toContain('Includes unweaned animals')
      expect(keys).not.toContain('County Parish Holding number (CPH)')
    })

    it('Should omit the packages row when the commodity is off the package-count list', async () => {
      const card = cardByTitle(await sectionsFor(gatedOffSeed), 'Fish (0301)')
      expect(keysOf(card.rows)).not.toContain('Number of packages')
    })

    it('Should omit the transited-countries row for a non-overland means of transport', async () => {
      expect(keysOf(rowsOf(await sectionsFor(gatedOffSeed)))).not.toContain(
        'Countries that the consignment will travel through'
      )
    })

    it('Should expand the private transporter and omit the approval-number row when the type is private', async () => {
      const card = cardByTitle(
        await sectionsFor(gatedOffSeed),
        'Transport details'
      )
      expect(valueOf(card.rows, 'Name')).toBe('Jean Dupont')
      expect(valueOf(card.rows, 'Type')).toBe('Private')
      expect(keysOf(card.rows)).not.toContain('Approval number')
    })

    it('Should omit the identifier table and documents section when neither holds an entry', async () => {
      const sections = await sectionsFor(gatedOffSeed)
      expect(cardByTitle(sections, 'Fish (0301)').identifierTable).toBeNull()
      expect(sections.map((section) => section.heading)).not.toContain(
        '4. Documents'
      )
    })

    it('Should render Not provided for a blank plain answer', async () => {
      const rows = rowsOf(await sectionsFor(gatedOffSeed))
      expect(valueOf(rows, 'Internal reference number')).toBe('Not provided')
      expect(valueOf(rows, 'Port of entry')).toBe('Not provided')
    })

    it('Should render Not provided when a coded answer has no matching label', async () => {
      expect(
        valueOf(rowsOf(await sectionsFor(gatedOffSeed)), 'Country of origin')
      ).toBe('Not provided')
    })

    it('Should render Not provided for a blank date', async () => {
      expect(
        valueOf(
          rowsOf(await sectionsFor(gatedOffSeed)),
          'Arrival date at port of entry'
        )
      ).toBe('Not provided')
    })

    it('Should render Not provided for an unset party', async () => {
      const card = cardByTitle(
        await sectionsFor(gatedOffSeed),
        'Roles and addresses'
      )
      expect(valueOf(card.rows, 'Consignor')).toBe('Not provided')
    })
  })

  describe('POST navigation', () => {
    it('Should redirect to the hub when the next review page is not yet reachable', async () => {
      const { response } = await driveHandler(postHandler, { seed: {} })
      expect(response.redirect).toBe(hubPath())
    })

    it('Should redirect to the declaration once its prerequisites are answered', async () => {
      const { response } = await driveHandler(postHandler, {
        seed: {
          countryOfOrigin: 'FR',
          commodityLines: [{ commoditySelection: 'Cow' }]
        }
      })
      expect(response.redirect).toMatch(/\/declaration$/)
    })
  })
})
