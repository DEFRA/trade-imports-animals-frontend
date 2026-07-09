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

const rowsFor = (seed) => driveHandler(getHandler, { seed }).view.context.rows
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
      commoditySelection: '0102 - Cattle',
      numberOfAnimalsQuantity: '25',
      animalIdentifiers: [
        {
          animalIdentifierPassport: 'UK123456789',
          permanentAddress: { name: 'Pet Owner' }
        }
      ]
    }
  ],
  reasonForImport: 'internal-market',
  purposeInInternalMarket: 'breeding',
  animalsCertifiedFor: 'slaughter',
  containsUnweanedAnimals: 'no',
  documents: [
    {
      accompanyingDocumentType: 'ITAHC',
      accompanyingDocumentReference: 'GBHC1234567890'
    }
  ],
  placeOfOrigin: { name: 'Ferme des Trois Vallees' },
  consignor: { name: 'Laiterie du Nord' },
  consignee: { name: 'Yorkshire Dales Livestock' },
  importer: { name: 'Albion Livestock Imports' },
  placeOfDestination: { name: 'Tech Imports Ltd' },
  countyParishHoldingCph: '12/345/6789',
  portOfEntry: 'Aberdeen Airport',
  arrivalDateAtPort: { day: '12', month: '12', year: '2026' },
  meansOfTransport: 'Road Vehicle',
  transportIdentification: 'FR-892-LK',
  transportDocumentReference: 'CMR-2026-884721',
  transitedCountries: ['FR', 'BE'],
  transporterType: 'Commercial transporter',
  commercialTransporter: { name: 'Channel Livestock Logistics' },
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
    it('Should resolve service-backed labels for coded answers', () => {
      const rows = rowsFor(fullSeed)
      expect(valueOf(rows, 'Country of origin')).toBe('France')
      expect(valueOf(rows, 'Reason for import')).toBe('Internal market')
      expect(valueOf(rows, 'Purpose in the internal market')).toBe('Breeding')
      expect(valueOf(rows, 'Animals certified for')).toBe('Slaughter')
    })

    it('Should map yes/no coded answers to Yes/No labels', () => {
      const rows = rowsFor(fullSeed)
      expect(valueOf(rows, 'Region of origin code required')).toBe('Yes')
      expect(valueOf(rows, 'Contains unweaned animals')).toBe('No')
    })

    it('Should include the region-of-origin-code row when the requirement is yes', () => {
      expect(valueOf(rowsFor(fullSeed), 'Region of origin code')).toBe('FR-75')
    })

    it('Should include the internal-market purpose row when the reason is internal-market', () => {
      expect(valueOf(rowsFor(fullSeed), 'Purpose in the internal market')).toBe(
        'Breeding'
      )
    })

    it('Should include the unweaned row when a line is an unweaned-eligible commodity', () => {
      expect(keysOf(rowsFor(fullSeed))).toContain('Contains unweaned animals')
    })

    it('Should include the CPH row when a line is a CPH-eligible commodity', () => {
      expect(valueOf(rowsFor(fullSeed), 'County Parish Holding (CPH)')).toBe(
        '12/345/6789'
      )
    })

    it('Should include the transited-countries row for an overland means of transport, labelling each code', () => {
      expect(valueOf(rowsFor(fullSeed), 'Transited countries')).toBe(
        'France, Belgium'
      )
    })

    it('Should include the commercial-transporter row and omit the private one when the type is commercial', () => {
      const rows = rowsFor(fullSeed)
      expect(valueOf(rows, 'Commercial transporter')).toBe(
        'Channel Livestock Logistics'
      )
      expect(keysOf(rows)).not.toContain('Private transporter')
    })

    it('Should render one row per commodity line with quantity, plus a nested animal-identifier row', () => {
      const rows = rowsFor(fullSeed)
      expect(valueOf(rows, 'Commodity 1')).toBe('0102 - Cattle — 25 animals')
      expect(valueOf(rows, 'Commodity 1 — animal 1')).toBe(
        'Passport: UK123456789, Permanent address: Pet Owner'
      )
    })

    it('Should render a document row with its type and reference', () => {
      expect(valueOf(rowsFor(fullSeed), 'Document 1')).toBe(
        'ITAHC — GBHC1234567890'
      )
    })

    it('Should format the arrival date as day/month/year', () => {
      expect(valueOf(rowsFor(fullSeed), 'Arrival date at port of entry')).toBe(
        '12/12/2026'
      )
    })

    it('Should read party rows from the stored party name', () => {
      const rows = rowsFor(fullSeed)
      expect(valueOf(rows, 'Consignor')).toBe('Laiterie du Nord')
      expect(valueOf(rows, 'Place of destination')).toBe('Tech Imports Ltd')
      expect(valueOf(rows, 'Contact address')).toBe(
        'Animal and Plant Health Agency'
      )
    })

    it('Should point each Change link at the owning page slug with a change flag', () => {
      const rows = rowsFor(fullSeed)
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

    it('Should point commodity Change and nested-animal links at the commodities pages', () => {
      const rows = rowsFor(fullSeed)
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
      commodityLines: [{ commoditySelection: '0301 - Fish' }],
      meansOfTransport: 'Airplane',
      transporterType: 'Private transporter',
      privateTransporter: { name: 'Jean Dupont' }
    }

    it('Should omit the region-of-origin-code row when the requirement is no', () => {
      expect(keysOf(rowsFor(gatedOffSeed))).not.toContain(
        'Region of origin code'
      )
    })

    it('Should omit the internal-market purpose row when the reason is not internal-market', () => {
      expect(keysOf(rowsFor(gatedOffSeed))).not.toContain(
        'Purpose in the internal market'
      )
    })

    it('Should omit the unweaned and CPH rows when no line is an eligible commodity', () => {
      const keys = keysOf(rowsFor(gatedOffSeed))
      expect(keys).not.toContain('Contains unweaned animals')
      expect(keys).not.toContain('County Parish Holding (CPH)')
    })

    it('Should omit the transited-countries row for a non-overland means of transport', () => {
      expect(keysOf(rowsFor(gatedOffSeed))).not.toContain('Transited countries')
    })

    it('Should include the private-transporter row and omit the commercial one when the type is private', () => {
      const rows = rowsFor(gatedOffSeed)
      expect(valueOf(rows, 'Private transporter')).toBe('Jean Dupont')
      expect(keysOf(rows)).not.toContain('Commercial transporter')
    })

    it('Should render Not provided for a blank plain answer', () => {
      const rows = rowsFor(gatedOffSeed)
      expect(valueOf(rows, 'Internal reference number')).toBe('Not provided')
      expect(valueOf(rows, 'Port of entry')).toBe('Not provided')
    })

    it('Should render Not provided when a coded answer has no matching label', () => {
      expect(valueOf(rowsFor(gatedOffSeed), 'Country of origin')).toBe(
        'Not provided'
      )
    })

    it('Should render Not provided for a blank date', () => {
      expect(
        valueOf(rowsFor(gatedOffSeed), 'Arrival date at port of entry')
      ).toBe('Not provided')
    })

    it('Should render Not provided for an unset party', () => {
      expect(valueOf(rowsFor(gatedOffSeed), 'Consignor')).toBe('Not provided')
    })
  })

  describe('POST navigation', () => {
    it('Should redirect to the hub when the next review page is not yet reachable', () => {
      const { response } = driveHandler(postHandler, { seed: {} })
      expect(response.redirect).toBe(hubPath())
    })

    it('Should redirect to the declaration once its prerequisites are answered', () => {
      const { response } = driveHandler(postHandler, {
        seed: {
          countryOfOrigin: 'FR',
          commodityLines: [{ commoditySelection: '0102 - Cattle' }]
        }
      })
      expect(response.redirect).toMatch(/\/declaration$/)
    })
  })
})
