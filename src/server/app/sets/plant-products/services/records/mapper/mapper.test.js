import { describe, expect, it } from 'vitest'

import { fromDto as mapFromDto } from './from-dto.js'
import { documentToDto, toDto } from './to-dto.js'
import { stubOrganisationOperator } from '../../stub-org.js'

const withImporter = (dto = {}) => ({
  ...dto,
  importer: stubOrganisationOperator()
})

const fromDto = (dto) => {
  const { nominatedContacts, ...answers } = mapFromDto(dto)
  expect(nominatedContacts).toEqual([])
  return answers
}

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
    const { importer, ...answerOwnedDto } = toDto({})

    expect(importer).toEqual(stubOrganisationOperator())
    expect(answerOwnedDto).toEqual({})
  })

  it('round-trips the m0 answers tree', () => {
    const answers = {}

    expect(fromDto(toDto(answers))).toEqual(answers)
  })

  it('round-trips the country-of-origin code through origin.countryCode', () => {
    const answers = { countryOfOrigin: 'GB-SCT' }

    expect(toDto(answers)).toEqual(
      withImporter({
        origin: { countryCode: 'GB-SCT' }
      })
    )
    expect(fromDto(toDto(answers))).toEqual(answers)
  })

  it('round-trips the consignment country and internal reference through origin', () => {
    const answers = {
      countryOfConsignment: 'IE',
      internalReference: 'REF-123'
    }

    expect(toDto(answers)).toEqual(
      withImporter({
        origin: {
          countryOfConsignmentCode: 'IE',
          internalReference: 'REF-123'
        }
      })
    )
    expect(fromDto(toDto(answers))).toEqual(answers)
  })

  it('does not fabricate an absent optional internal reference', () => {
    const answers = { countryOfConsignment: 'IE' }

    expect(toDto(answers)).toEqual(
      withImporter({
        origin: { countryOfConsignmentCode: 'IE' }
      })
    )
    expect(fromDto(toDto(answers))).toEqual(answers)
  })

  it('round-trips the normalised reason-for-import enum at the DTO top level', () => {
    const answers = { reasonForImport: 'RE_CONFORMITY_CHECK' }

    expect(toDto(answers)).toEqual(
      withImporter({
        reasonForImport: 'RE_CONFORMITY_CHECK'
      })
    )
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

    expect(toDto(answers)).toEqual(
      withImporter({
        commodity: { inputMethod: 'MANUAL' }
      })
    )
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

  it('does not put flow-only or accompanying-document answers in the notification DTO', () => {
    expect(
      toDto({
        importType: 'plant-products',
        declaration: { agreed: true },
        accompanyingDocuments: [{ documentReference: 'PHYTO-COPY-001' }]
      })
    ).toEqual(withImporter())
  })

  it('never maps declaration in either DTO direction', () => {
    expect(toDto({ declaration: 'confirmed' })).not.toHaveProperty(
      'declaration'
    )
    expect(
      fromDto({ declaration: { agreed: true, declaredAt: '2026-08-03' } })
    ).not.toHaveProperty('declaration')
  })

  it('drops server-set and unknown response fields while folding embedded documents', () => {
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

    expect(fromDto(dto)).toEqual({
      accompanyingDocuments: [
        {
          documentType: 'PHYTOSANITARY_CERTIFICATE',
          documentReference: 'PHYTO-COPY-001',
          issueDate: { day: '', month: '', year: '' }
        }
      ]
    })
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
    expect(toDto({ commodityLines: [] })).toEqual(
      withImporter({
        commodity: { commodityComplement: [] }
      })
    )
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

    expect(dto).toEqual(withImporter({ additionalDetails: answers }))
    expect(fromDto(dto)).toEqual(answers)
    expect(JSON.stringify(dto)).not.toMatch(/netWeightTotal|packagesTotal/)
  })

  it('round-trips weight alone without fabricating optional volume fields', () => {
    const answers = { totalGrossWeight: '12.5' }

    const dto = toDto(answers)

    expect(dto).toEqual(withImporter({ additionalDetails: answers }))
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

    expect(toDto(answers)).toEqual(withImporter({ transport: answers }))
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

  it('round-trips ADD_MRN_NOW, its MRN and a boolean GVMS answer', () => {
    const answers = {
      commonTransitConvention: 'ADD_MRN_NOW',
      movementReferenceNumber: '24GB123456789AB012',
      usingGvms: true
    }

    expect(toDto(answers)).toEqual(
      withImporter({ goodsMovementServices: answers })
    )
    expect(fromDto(toDto(answers))).toEqual(answers)
  })

  it('omits a stale MRN from the DTO when the CTC branch is NO', () => {
    const dto = toDto({
      commonTransitConvention: 'NO',
      movementReferenceNumber: '24GB123456789AB012',
      usingGvms: false
    })

    expect(dto).toEqual(
      withImporter({
        goodsMovementServices: {
          commonTransitConvention: 'NO',
          usingGvms: false
        }
      })
    )
    expect(dto.goodsMovementServices).not.toHaveProperty(
      'movementReferenceNumber'
    )
    expect(fromDto(dto)).not.toHaveProperty('movementReferenceNumber')
  })

  it('does not fabricate the goods-movement section when nothing is answered', () => {
    expect(toDto({})).not.toHaveProperty('goodsMovementServices')
    expect(fromDto({})).not.toHaveProperty('commonTransitConvention')
    expect(fromDto({ goodsMovementServices: {} })).toEqual({})
  })

  it('keeps usingGvms boolean in both DTO directions without inventing false', () => {
    expect(toDto({ usingGvms: false })).toEqual(
      withImporter({
        goodsMovementServices: { usingGvms: false }
      })
    )
    expect(fromDto({ goodsMovementServices: { usingGvms: true } })).toEqual({
      usingGvms: true
    })
    expect(fromDto({ goodsMovementServices: {} })).not.toHaveProperty(
      'usingGvms'
    )
  })

  it('round-trips all three responsible-person contact fields', () => {
    const answers = {
      responsiblePersonName: 'Isabel Irwin',
      responsiblePersonEmail: 'isabel@example.com',
      responsiblePersonTelephone: '+44 7700 900 982'
    }

    expect(toDto(answers)).toEqual(
      withImporter({
        responsiblePerson: {
          name: 'Isabel Irwin',
          email: 'isabel@example.com',
          telephone: '+44 7700 900 982'
        }
      })
    )
    expect(fromDto(toDto(answers))).toEqual(answers)
  })

  it('round-trips name and email without null-stuffing telephone or emitting isAgent', () => {
    const answers = {
      responsiblePersonName: 'Isabel Irwin',
      responsiblePersonEmail: 'isabel@example.com'
    }

    const dto = toDto(answers)

    expect(dto).toEqual(
      withImporter({
        responsiblePerson: {
          name: 'Isabel Irwin',
          email: 'isabel@example.com'
        }
      })
    )
    expect(dto.responsiblePerson).not.toHaveProperty('telephone')
    expect(dto.responsiblePerson).not.toHaveProperty('isAgent')
    expect(fromDto(dto)).toEqual(answers)
  })

  it('omits an unanswered responsible person and drops absent or null DTO fields', () => {
    expect(toDto({})).not.toHaveProperty('responsiblePerson')
    expect(fromDto({})).not.toHaveProperty('responsiblePersonName')
    expect(fromDto({ responsiblePerson: {} })).toEqual({})
    expect(
      fromDto({
        responsiblePerson: {
          name: 'Isabel Irwin',
          email: null,
          telephone: null,
          isAgent: true
        }
      })
    ).toEqual({ responsiblePersonName: 'Isabel Irwin' })
  })

  it('round-trips two nominated contacts with independent optional fields and agent values', () => {
    const answers = {
      nominatedContacts: [
        {
          contactName: 'Alex Inspector',
          contactEmail: 'alex@example.com',
          contactIsAgent: false
        },
        {
          contactName: 'Blair Broker',
          contactTelephone: '+44 7700 900 982',
          contactIsAgent: true
        }
      ]
    }

    const dto = toDto(answers)

    expect(dto.nominatedContacts).toEqual([
      {
        name: 'Alex Inspector',
        email: 'alex@example.com',
        isAgent: false
      },
      {
        name: 'Blair Broker',
        telephone: '+44 7700 900 982',
        isAgent: true
      }
    ])
    expect(mapFromDto(dto)).toEqual(answers)
  })

  it('omits an empty nominated-contact list on write and rehydrates absent or empty lists to an empty array', () => {
    expect(toDto({ nominatedContacts: [] })).not.toHaveProperty(
      'nominatedContacts'
    )
    expect(mapFromDto({})).toEqual({ nominatedContacts: [] })
    expect(mapFromDto({ nominatedContacts: [] })).toEqual({
      nominatedContacts: []
    })
  })

  it('projects same-as Yes as an importer copy and re-derives Yes when destination deeply equals importer', () => {
    const dto = toDto({ destinationSameAsConsignee: true })

    expect(dto.importer).toEqual(stubOrganisationOperator())
    expect(dto.destination).toEqual(dto.importer)
    expect(dto.destination).not.toBe(dto.importer)
    expect(dto).not.toHaveProperty('destinationSameAsConsignee')
    expect(fromDto(dto)).toEqual({ destinationSameAsConsignee: true })
  })

  it('round-trips an entered destination and re-derives No when destination differs from importer', () => {
    const answers = {
      destinationSameAsConsignee: false,
      destinationName: 'Paris Produce Market',
      destinationAddressLine1: '10 Rue des Plantes',
      destinationAddressLine2: 'Building 2',
      destinationAddressLine3: 'Wholesale Quarter',
      destinationCity: 'Paris',
      destinationPostcode: '75001',
      destinationCountry: 'FR'
    }

    const dto = toDto(answers)

    expect(dto.destination).toEqual({
      name: 'Paris Produce Market',
      address: {
        addressLine1: '10 Rue des Plantes',
        addressLine2: 'Building 2',
        addressLine3: 'Wholesale Quarter',
        city: 'Paris',
        postcode: '75001',
        country: 'FR'
      }
    })
    expect(dto).not.toHaveProperty('destinationSameAsConsignee')
    expect(dto.destination).not.toHaveProperty('email')
    expect(dto.destination).not.toHaveProperty('telephone')
    expect(fromDto(dto)).toEqual(answers)
  })

  it('keeps the radio unanswered when no destination exists', () => {
    const dto = toDto({})

    expect(dto).not.toHaveProperty('destination')
    expect(dto).not.toHaveProperty('destinationSameAsConsignee')
    expect(fromDto(dto)).not.toHaveProperty('destinationSameAsConsignee')
  })

  it('round-trips a partial optional packer and omits an entirely empty packer', () => {
    const answers = {
      packerName: 'Packing SARL',
      packerAddressLine1: '20 Rue du Colis',
      packerCity: 'Calais',
      packerPostcode: '62100',
      packerCountry: 'FR'
    }

    const dto = toDto(answers)

    expect(dto.packer).toEqual({
      name: 'Packing SARL',
      address: {
        addressLine1: '20 Rue du Colis',
        city: 'Calais',
        postcode: '62100',
        country: 'FR'
      }
    })
    expect(dto.packer).not.toHaveProperty('email')
    expect(dto.packer).not.toHaveProperty('telephone')
    expect(fromDto(dto)).toEqual(answers)
    expect(
      toDto({
        packerName: '',
        packerAddressLine1: '',
        packerAddressLine2: '',
        packerAddressLine3: '',
        packerCity: '',
        packerPostcode: '',
        packerCountry: ''
      })
    ).not.toHaveProperty('packer')
  })

  it('round-trips every fully populated consignor field without inventing operatorId', () => {
    const answers = {
      consignorName: 'Orchard Export SAS',
      consignorAddressLine1: '12 Rue des Vergers',
      consignorAddressLine2: 'Building B',
      consignorAddressLine3: 'Export Quarter',
      consignorCity: 'Lyon',
      consignorPostcode: '69001',
      consignorTelephone: '+33 4 72 00 00 00',
      consignorCountry: 'FR',
      consignorEmail: 'exports@example.com'
    }

    const dto = toDto(answers)

    expect(dto.consignor).toEqual({
      name: 'Orchard Export SAS',
      telephone: '+33 4 72 00 00 00',
      email: 'exports@example.com',
      address: {
        addressLine1: '12 Rue des Vergers',
        addressLine2: 'Building B',
        addressLine3: 'Export Quarter',
        city: 'Lyon',
        postcode: '69001',
        country: 'FR'
      }
    })
    expect(dto.consignor).not.toHaveProperty('operatorId')
    expect(fromDto(dto)).toEqual(answers)
  })

  it('round-trips a consignor without optional address lines or postcode', () => {
    const answers = {
      consignorName: 'Orchard Export SAS',
      consignorAddressLine1: '12 Rue des Vergers',
      consignorCity: 'Lyon',
      consignorTelephone: '+33 4 72 00 00 00',
      consignorCountry: 'FR',
      consignorEmail: 'exports@example.com'
    }

    const dto = toDto(answers)

    expect(dto.consignor.address).toEqual({
      addressLine1: '12 Rue des Vergers',
      city: 'Lyon',
      country: 'FR'
    })
    expect(dto.consignor.address).not.toHaveProperty('addressLine2')
    expect(dto.consignor.address).not.toHaveProperty('addressLine3')
    expect(dto.consignor.address).not.toHaveProperty('postcode')
    expect(fromDto(dto)).toEqual(answers)
  })

  it('does not fabricate consignor answers when the DTO has no consignor', () => {
    const answers = fromDto(withImporter())

    expect(answers).not.toHaveProperty('consignorName')
    expect(answers).not.toHaveProperty('consignorAddressLine1')
    expect(answers).not.toHaveProperty('consignorTelephone')
    expect(answers).not.toHaveProperty('consignorEmail')
  })

  it('maps one document to the exact metadata-only sub-resource DTO', () => {
    const dto = documentToDto({
      id: 'answer-side-id',
      notificationReferenceNumber: 'GBN-PP-26-ABC001',
      documentType: 'PHYTOSANITARY_CERTIFICATE',
      documentReference: 'PHYTO-001',
      issueDate: { day: '4', month: '12', year: '2025' },
      files: [{ fileId: 'must-not-leak' }]
    })

    expect(dto).toEqual({
      documentType: 'PHYTOSANITARY_CERTIFICATE',
      documentReference: 'PHYTO-001',
      issueDate: '2025-12-04'
    })
    expect(dto).not.toHaveProperty('id')
    expect(dto).not.toHaveProperty('notificationReferenceNumber')
    expect(dto).not.toHaveProperty('files')
  })

  it('folds two embedded documents into ordered answer entries and drops server metadata', () => {
    const answers = fromDto({
      accompanyingDocuments: [
        {
          id: 'server-doc-1',
          documentType: 'PHYTOSANITARY_CERTIFICATE',
          documentReference: 'PHYTO-001',
          issueDate: '2025-12-04',
          files: [{ fileId: 'file-1' }]
        },
        {
          id: 'server-doc-2',
          documentType: 'AIR_WAYBILL',
          documentReference: 'AIR-002',
          issueDate: '2026-03-27',
          files: []
        }
      ]
    })

    expect(answers).toEqual({
      accompanyingDocuments: [
        {
          documentType: 'PHYTOSANITARY_CERTIFICATE',
          documentReference: 'PHYTO-001',
          issueDate: { day: '4', month: '12', year: '2025' }
        },
        {
          documentType: 'AIR_WAYBILL',
          documentReference: 'AIR-002',
          issueDate: { day: '27', month: '3', year: '2026' }
        }
      ]
    })
    expect(JSON.stringify(answers)).not.toMatch(/server-doc|file-1/)
  })

  it('round-trips one document entry through the sub-resource projection', () => {
    const entry = {
      documentType: 'PHYTOSANITARY_CERTIFICATE',
      documentReference: 'PHYTO-001',
      issueDate: { day: '4', month: '12', year: '2025' }
    }

    expect(
      fromDto({ accompanyingDocuments: [documentToDto(entry)] })
        .accompanyingDocuments[0]
    ).toEqual(entry)
  })

  it('omits the documents key for absent and empty embedded arrays', () => {
    expect(fromDto({})).not.toHaveProperty('accompanyingDocuments')
    expect(fromDto({ accompanyingDocuments: [] })).not.toHaveProperty(
      'accompanyingDocuments'
    )
  })
})
