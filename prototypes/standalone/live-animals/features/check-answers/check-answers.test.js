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

const rowsFor = async (seed) =>
  (await driveHandler(getHandler, { seed })).view.context.rows
const rowByKey = (rows, key) => rows.find((row) => row.key.text === key)
const valueOf = (rows, key) => rowByKey(rows, key)?.value.text
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
      numberOfAnimalsQuantity: '25',
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
      accompanyingDocumentReference: 'GBHC1234567890'
    }
  ],
  placeOfOrigin: { name: 'Origin Farm' },
  consignor: { name: 'Astra Rosales' },
  consignee: { name: 'British Livestock Ltd' },
  importer: { name: 'Import Co UK' },
  placeOfDestination: { name: 'Tech Imports Ltd' },
  countyParishHoldingCph: '12/345/6789',
  portOfEntry: 'Aberdeen Airport',
  arrivalDateAtPort: { day: '12', month: '12', year: '2026' },
  meansOfTransport: 'Road Vehicle',
  transportIdentification: 'FR-892-LK',
  transportDocumentReference: 'CMR-2026-884721',
  transitedCountries: ['FR', 'BE'],
  transporterType: 'Commercial',
  commercialTransporter: { name: 'García Livestock Transport SL' },
  contactAddress: { name: 'Animal and Plant Health Agency' }
}

describe('#buildRows (check-answers GET)', () => {
  beforeAll(() => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    buildDispatch(dispatchPages)
    configureReadyForCheckYourAnswers(readyForCheckYourAnswers)
  })
  beforeEach(() => store.clear())

  describe('fully-populated notification', () => {
    it('Should resolve service-backed labels for coded answers', async () => {
      const rows = await rowsFor(fullSeed)
      expect(valueOf(rows, 'Country of origin')).toBe('France')
      expect(valueOf(rows, 'Reason for import')).toBe('Internal market')
      expect(valueOf(rows, 'Purpose in the internal market')).toBe('Breeding')
      expect(valueOf(rows, 'Animals certified for')).toBe('Slaughter')
    })

    it('Should map yes/no coded answers to Yes/No labels', async () => {
      const rows = await rowsFor(fullSeed)
      expect(valueOf(rows, 'Region of origin code required')).toBe('Yes')
      expect(valueOf(rows, 'Contains unweaned animals')).toBe('No')
    })

    it('Should include the region-of-origin-code row when the requirement is yes', async () => {
      expect(valueOf(await rowsFor(fullSeed), 'Region of origin code')).toBe(
        'FR-75'
      )
    })

    it('Should include the internal-market purpose row when the reason is internalMarket', async () => {
      expect(
        valueOf(await rowsFor(fullSeed), 'Purpose in the internal market')
      ).toBe('Breeding')
    })

    it('Should include the unweaned row when a line is an unweaned-eligible commodity', async () => {
      expect(keysOf(await rowsFor(fullSeed))).toContain(
        'Contains unweaned animals'
      )
    })

    it('Should include the CPH row when a line is a CPH-eligible commodity', async () => {
      expect(
        valueOf(await rowsFor(fullSeed), 'County Parish Holding (CPH)')
      ).toBe('12/345/6789')
    })

    it('Should include the transited-countries row for an overland means of transport, labelling each code', async () => {
      expect(valueOf(await rowsFor(fullSeed), 'Transited countries')).toBe(
        'France, Belgium'
      )
    })

    it('Should include the commercial-transporter row and omit the private one when the type is commercial', async () => {
      const rows = await rowsFor(fullSeed)
      expect(valueOf(rows, 'Commercial transporter')).toBe(
        'García Livestock Transport SL'
      )
      expect(keysOf(rows)).not.toContain('Private transporter')
    })

    it('Should render one row per commodity line with quantity, plus a nested animal-identifier row', async () => {
      const rows = await rowsFor(fullSeed)
      expect(valueOf(rows, 'Commodity 1')).toBe('Cow — 25 animals')
      expect(valueOf(rows, 'Commodity 1 — animal 1')).toBe(
        'Passport: UK123456789, Permanent address: Pet Owner'
      )
    })

    it('Should render a document row with its type and reference', async () => {
      expect(valueOf(await rowsFor(fullSeed), 'Document 1')).toBe(
        'ITAHC — GBHC1234567890'
      )
    })

    it('Should format the arrival date as day/month/year', async () => {
      expect(
        valueOf(await rowsFor(fullSeed), 'Arrival date at port of entry')
      ).toBe('12/12/2026')
    })

    it('Should read party rows from the stored party name', async () => {
      const rows = await rowsFor(fullSeed)
      expect(valueOf(rows, 'Consignor')).toBe('Astra Rosales')
      expect(valueOf(rows, 'Place of destination')).toBe('Tech Imports Ltd')
      expect(valueOf(rows, 'Contact address')).toBe(
        'Animal and Plant Health Agency'
      )
    })

    it('Should point each Change link at the owning page slug with a change flag', async () => {
      const rows = await rowsFor(fullSeed)
      expect(changeHrefOf(rows, 'Country of origin')).toMatch(
        /\/origin\?change=1$/
      )
      expect(changeHrefOf(rows, 'Purpose in the internal market')).toMatch(
        /\/import-purpose\?change=1$/
      )
      expect(changeHrefOf(rows, 'Transited countries')).toMatch(
        /\/transport-details\?change=1$/
      )
      expect(changeHrefOf(rows, 'Commercial transporter')).toMatch(
        /\/transporters\/select\?change=1$/
      )
    })

    it('Should point commodity Change and nested-animal links at the commodities pages', async () => {
      const rows = await rowsFor(fullSeed)
      expect(changeHrefOf(rows, 'Commodity 1')).toMatch(/\/commodities$/)
      expect(changeHrefOf(rows, 'Commodity 1 — animal 1')).toMatch(
        /\/commodities\/0\/identifiers$/
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
      expect(keysOf(await rowsFor(gatedOffSeed))).not.toContain(
        'Region of origin code'
      )
    })

    it('Should omit the internal-market purpose row when the reason is not internalMarket', async () => {
      expect(keysOf(await rowsFor(gatedOffSeed))).not.toContain(
        'Purpose in the internal market'
      )
    })

    it('Should omit the unweaned and CPH rows when no line is an eligible commodity', async () => {
      const keys = keysOf(await rowsFor(gatedOffSeed))
      expect(keys).not.toContain('Contains unweaned animals')
      expect(keys).not.toContain('County Parish Holding (CPH)')
    })

    it('Should omit the transited-countries row for a non-overland means of transport', async () => {
      expect(keysOf(await rowsFor(gatedOffSeed))).not.toContain(
        'Transited countries'
      )
    })

    it('Should include the private-transporter row and omit the commercial one when the type is private', async () => {
      const rows = await rowsFor(gatedOffSeed)
      expect(valueOf(rows, 'Private transporter')).toBe('Jean Dupont')
      expect(keysOf(rows)).not.toContain('Commercial transporter')
    })

    it('Should render Not provided for a blank plain answer', async () => {
      const rows = await rowsFor(gatedOffSeed)
      expect(valueOf(rows, 'Internal reference number')).toBe('Not provided')
      expect(valueOf(rows, 'Port of entry')).toBe('Not provided')
    })

    it('Should render Not provided when a coded answer has no matching label', async () => {
      expect(valueOf(await rowsFor(gatedOffSeed), 'Country of origin')).toBe(
        'Not provided'
      )
    })

    it('Should render Not provided for a blank date', async () => {
      expect(
        valueOf(await rowsFor(gatedOffSeed), 'Arrival date at port of entry')
      ).toBe('Not provided')
    })

    it('Should render Not provided for an unset party', async () => {
      expect(valueOf(await rowsFor(gatedOffSeed), 'Consignor')).toBe(
        'Not provided'
      )
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
