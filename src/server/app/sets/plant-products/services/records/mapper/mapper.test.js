import { describe, expect, it } from 'vitest'

import { fromDto } from './from-dto.js'
import { toDto } from './to-dto.js'

const SERVER_SET_FIELDS = [
  'referenceNumber',
  'status',
  'chedType',
  'ownership',
  'created',
  'updated',
  'expireAt',
  'submittedBaseline'
]

describe('plant-products notification mapper at the m0 boundary', () => {
  it('maps the empty m0 answers tree to an empty DTO', () => {
    expect(toDto({})).toEqual({})
  })

  it('round-trips the m0 answers tree', () => {
    const answers = {}

    expect(fromDto(toDto(answers))).toEqual(answers)
  })

  it('round-trips the country-of-origin code through origin.countryCode', () => {
    const answers = { countryOfOrigin: 'GB-SCT' }

    expect(toDto(answers)).toEqual({
      origin: { countryCode: 'GB-SCT' }
    })
    expect(fromDto(toDto(answers))).toEqual(answers)
  })

  it('round-trips the consignment country and internal reference through origin', () => {
    const answers = {
      countryOfConsignment: 'IE',
      internalReference: 'REF-123'
    }

    expect(toDto(answers)).toEqual({
      origin: {
        countryOfConsignmentCode: 'IE',
        internalReference: 'REF-123'
      }
    })
    expect(fromDto(toDto(answers))).toEqual(answers)
  })

  it('does not fabricate an absent optional internal reference', () => {
    const answers = { countryOfConsignment: 'IE' }

    expect(toDto(answers)).toEqual({
      origin: { countryOfConsignmentCode: 'IE' }
    })
    expect(fromDto(toDto(answers))).toEqual(answers)
  })

  it('round-trips the normalised reason-for-import enum at the DTO top level', () => {
    const answers = { reasonForImport: 'RE_CONFORMITY_CHECK' }

    expect(toDto(answers)).toEqual({
      reasonForImport: 'RE_CONFORMITY_CHECK'
    })
    expect(fromDto(toDto(answers))).toEqual(answers)
  })

  it('does not fabricate reasonForImport when it is unanswered', () => {
    expect(toDto({ countryOfOrigin: 'FR' })).not.toHaveProperty(
      'reasonForImport'
    )
    expect(fromDto({ origin: { countryCode: 'FR' } })).not.toHaveProperty(
      'reasonForImport'
    )
  })

  it('round-trips commodityInputMethod through commodity.inputMethod', () => {
    const answers = { commodityInputMethod: 'MANUAL' }

    expect(toDto(answers)).toEqual({
      commodity: { inputMethod: 'MANUAL' }
    })
    expect(fromDto(toDto(answers))).toEqual(answers)
  })

  it('does not fabricate commodity.inputMethod when it is unanswered', () => {
    expect(toDto({ commodityLines: [] }).commodity).not.toHaveProperty(
      'inputMethod'
    )
    expect(
      fromDto({ commodity: { commodityComplement: [] } })
    ).not.toHaveProperty('commodityInputMethod')
  })

  it('omits server-set fields from the PUT content DTO', () => {
    const answers = Object.fromEntries(
      SERVER_SET_FIELDS.map((field) => [field, `answer-${field}`])
    )

    const dto = toDto(answers)

    for (const field of SERVER_SET_FIELDS) {
      expect(dto).not.toHaveProperty(field)
    }
  })

  it('does not invent homes for flow-only or accompanying-document answers', () => {
    expect(
      toDto({
        importType: 'plant-products',
        declaration: { agreed: true },
        accompanyingDocuments: [{ documentReference: 'PHYTO-COPY-001' }]
      })
    ).toEqual({})
  })

  it('drops server-set and unknown response fields and ignores embedded documents', () => {
    const dto = {
      referenceNumber: 'GBN-PP-26-ABC001',
      status: 'DRAFT',
      chedType: 'CHEDPP',
      ownership: { assignedOrganisationId: 'stub-org' },
      created: '2026-08-01T10:00:00',
      updated: '2026-08-01T11:00:00',
      expireAt: '2026-09-01T10:00:00',
      submittedBaseline: { status: 'DRAFT' },
      unknownBackendField: 'contract drift',
      accompanyingDocuments: [
        {
          documentType: 'PHYTOSANITARY_CERTIFICATE',
          documentReference: 'PHYTO-COPY-001'
        }
      ]
    }

    expect(fromDto(dto)).toEqual({})
  })

  it('treats null and absent DTOs as an empty answers tree', () => {
    expect(fromDto()).toEqual({})
    expect(fromDto(null)).toEqual({})
  })

  it('round-trips every modelled commodity leaf through three collection levels', () => {
    const answers = {
      commodityLines: [
        {
          uniqueComplementId: 'server-line-1',
          commoditySelection: '08059000',
          numberOfPackages: 0,
          packageType: 'BX',
          quantity: 12.5,
          quantityType: 'PCS',
          netWeight: 8.75,
          controlledAtmosphereContainer: false,
          finishedOrPropagated: 'FINISHED',
          intendedForFinalUsers: true,
          testAndTrial: false,
          species: [
            {
              eppoCode: 'CIDAC',
              genusAndSpecies: 'Citrus australasica',
              speciesId: '1364882',
              varieties: [
                { variety: 'NONE', varietyClass: 'CLASS_I' },
                { variety: 'NONE', varietyClass: null }
              ]
            }
          ]
        }
      ]
    }

    expect(fromDto(toDto(answers))).toEqual(answers)
  })

  it('derives commodityDescription from the selected real fixture code only in the DTO', () => {
    const answers = {
      commodityLines: [{ commoditySelection: '06011010', species: [] }]
    }

    const dto = toDto(answers)

    expect(dto.commodity.commodityComplement[0]).toMatchObject({
      commodityCode: '06011010',
      commodityDescription: 'Hyacinths'
    })
    expect(fromDto(dto).commodityLines[0]).not.toHaveProperty(
      'commodityDescription'
    )
  })

  it('echoes a server-assigned uniqueComplementId and omits it for a new line', () => {
    const answers = {
      commodityLines: [
        { uniqueComplementId: 'server-line-1', species: [] },
        { species: [] }
      ]
    }

    const dto = toDto(answers)

    expect(dto.commodity.commodityComplement[0].uniqueComplementId).toBe(
      'server-line-1'
    )
    expect(dto.commodity.commodityComplement[1]).not.toHaveProperty(
      'uniqueComplementId'
    )
    expect(fromDto(dto)).toEqual(answers)
  })

  it('cannot leak transient add-species keys into any DTO level', () => {
    const transientKey = 'add-species-CIDAC'
    const dto = toDto({
      commodityLines: [
        {
          commoditySelection: '08059000',
          [transientKey]: 'draft line value',
          species: [
            {
              eppoCode: 'CIDAC',
              [transientKey]: 'draft species value',
              varieties: [
                {
                  variety: 'NONE',
                  [transientKey]: 'draft variety value'
                }
              ]
            }
          ]
        }
      ]
    })

    expect(JSON.stringify(dto)).not.toContain(transientKey)
    expect(dto.commodity.commodityComplement[0]).not.toHaveProperty(
      transientKey
    )
    expect(dto.commodity.commodityComplement[0].species[0]).not.toHaveProperty(
      transientKey
    )
    expect(
      dto.commodity.commodityComplement[0].species[0].varieties[0]
    ).not.toHaveProperty(transientKey)
  })

  it('maps an explicitly empty commodity collection to an empty DTO collection', () => {
    expect(toDto({ commodityLines: [] })).toEqual({
      commodity: { commodityComplement: [] }
    })
    expect(fromDto({ commodity: { commodityComplement: [] } })).toEqual({
      commodityLines: []
    })
  })

  it('round-trips all three additional-details fields without derived totals', () => {
    const answers = {
      totalGrossWeight: '12.5',
      grossVolume: '5',
      grossVolumeUnit: 'LITRES'
    }

    const dto = toDto(answers)

    expect(dto).toEqual({ additionalDetails: answers })
    expect(fromDto(dto)).toEqual(answers)
    expect(JSON.stringify(dto)).not.toMatch(/netWeightTotal|packagesTotal/)
  })

  it('round-trips weight alone without fabricating optional volume fields', () => {
    const answers = { totalGrossWeight: '12.5' }

    const dto = toDto(answers)

    expect(dto).toEqual({ additionalDetails: answers })
    expect(dto.additionalDetails).not.toHaveProperty('grossVolume')
    expect(dto.additionalDetails).not.toHaveProperty('grossVolumeUnit')
    expect(fromDto(dto)).toEqual(answers)
  })

  it('does not fabricate an additional-details section when nothing is answered', () => {
    expect(toDto({})).not.toHaveProperty('additionalDetails')
    expect(fromDto({})).not.toHaveProperty('totalGrossWeight')
    expect(fromDto({ additionalDetails: {} })).toEqual({})
  })

  it('round-trips every transport field and its container rows', () => {
    const answers = {
      borderControlPost: 'CONPNT',
      inspectionPremises: 'INSPBAR1',
      meansOfTransport: 'ROAD_VEHICLE',
      transportIdentification: 'AB12 CDE',
      transportDocumentReference: 'CMR-123',
      arrivalDate: '2026-10-31',
      arrivalTime: '14:50',
      usesContainers: true,
      containers: [
        {
          containerNumber: 'CONT-1',
          sealNumber: 'SEAL-1',
          officialSeal: true
        },
        {
          containerNumber: '',
          sealNumber: 'SEAL-2',
          officialSeal: false
        }
      ]
    }

    expect(toDto(answers)).toEqual({ transport: answers })
    expect(fromDto(toDto(answers))).toEqual(answers)
  })

  it('round-trips usesContainers No without inventing a containers key', () => {
    const answers = {
      borderControlPost: 'GBLHR4PP',
      meansOfTransport: 'AIRPLANE',
      transportIdentification: 'BA123',
      transportDocumentReference: 'AWB-123',
      arrivalDate: '2026-08-20',
      arrivalTime: '09:05',
      usesContainers: false
    }

    const dto = toDto(answers)

    expect(dto.transport.usesContainers).toBe(false)
    expect(dto.transport).not.toHaveProperty('containers')
    expect(fromDto(dto)).toEqual(answers)
    expect(fromDto(dto)).not.toHaveProperty('containers')
  })
})
