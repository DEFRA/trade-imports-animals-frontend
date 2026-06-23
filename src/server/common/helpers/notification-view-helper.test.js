import { describe, expect, test } from 'vitest'
import { mapNotificationToView } from './notification-view-helper.js'

const NOT_PROVIDED = 'Not provided'

describe('#mapNotificationToView', () => {
  describe('when given a fully populated notification', () => {
    const notification = {
      referenceNumber: 'IMP.GB.2026.1001401',
      status: 'DRAFT',
      createdAt: '2026-04-15T10:00:00.000Z',
      origin: {
        countryCode: 'FI',
        requiresRegionCode: 'no',
        internalReference: 'FIN-EXP-2026.449B'
      },
      commodity: {
        name: 'Cow',
        code: '0102',
        commodityComplement: [
          {
            typeOfCommodity: 'Domestic',
            species: [
              {
                text: 'Bos taurus',
                earTag: 'FILT.302291',
                passport: 'EU-BOV-442201'
              }
            ]
          }
        ]
      },
      additionalDetails: {
        certifiedFor: 'breedingAndOrProduction',
        unweanedAnimals: 'no'
      },
      reasonForImport: 'internalMarket',
      consignor: {
        name: 'Tampere Horse Transport',
        address: { addressLine1: 'Koprinatie 14', country: 'Finland' }
      },
      consignee: {
        name: 'Leicester Cattle Ltd',
        address: {
          addressLine1: 'Hill Farm Units 2 to 4',
          country: 'United Kingdom'
        }
      },
      importer: {
        name: 'Leicester Cattle Ltd',
        address: {
          addressLine1: 'Hill Farm Units 2 to 4',
          country: 'United Kingdom'
        }
      },
      destination: {
        name: 'Leicester Cattle Finishing Unit',
        address: { addressLine1: '1 Main Street', country: 'United Kingdom' }
      },
      cphNumber: '12/343/R783',
      transport: {
        portOfEntry: 'Port of Dover GBDVR',
        arrivalDate: '2026-04-20',
        transporter: {
          name: 'Nordic Livestock Haulage Oy',
          address: {
            addressLine1: 'Novel 3',
            city: 'Helsinki',
            country: 'Finland'
          },
          approvalNumber: 'FITH-2016-7781',
          type: 'Commercial transporter'
        }
      },
      documents: [
        {
          type: 'ITAHC',
          reference: 'DOC-001',
          validUntil: '2026-12-31',
          attachments: 'doc.pdf'
        }
      ]
    }

    test('Should map referenceNumber', () => {
      expect(mapNotificationToView(notification).referenceNumber).toBe(
        'IMP.GB.2026.1001401'
      )
    })

    test('Should map status', () => {
      expect(mapNotificationToView(notification).status).toBe('DRAFT')
    })

    test('Should format dateCreated from createdAt', () => {
      expect(mapNotificationToView(notification).dateCreated).toBe(
        '15 April 2026'
      )
    })

    test('Should map origin fields with country name from countryMap', () => {
      expect(
        mapNotificationToView(notification, { FI: 'Finland' }).origin
      ).toEqual({
        countryOfOrigin: 'Finland',
        regionOfConsignment: 'No',
        internalReference: 'FIN-EXP-2026.449B'
      })
    })

    test('Should fall back to country code when code is not in countryMap', () => {
      expect(
        mapNotificationToView(notification, {}).origin.countryOfOrigin
      ).toBe('FI')
    })

    test('Should fall back to country code when no countryMap is provided', () => {
      expect(mapNotificationToView(notification).origin.countryOfOrigin).toBe(
        'FI'
      )
    })

    test('Should map commodity name with code', () => {
      expect(mapNotificationToView(notification).commodity.name).toBe(
        'Cow (0102)'
      )
    })

    test('Should map species within commodity', () => {
      expect(mapNotificationToView(notification).commodity.species).toEqual([
        { name: 'Bos taurus', earTag: 'FILT.302291', passport: 'EU-BOV-442201' }
      ])
    })

    test('Should map additionalDetails', () => {
      expect(mapNotificationToView(notification).additionalDetails).toEqual({
        certifiedFor: 'Breeding and/or production',
        unweanedAnimals: 'No'
      })
    })

    test('Should map certifiedFor approvedBodies to display label', () => {
      expect(
        mapNotificationToView({
          additionalDetails: { certifiedFor: 'approvedBodies' }
        }).additionalDetails.certifiedFor
      ).toBe('Approved bodies')
    })

    test('Should map certifiedFor slaughter to display label', () => {
      expect(
        mapNotificationToView({
          additionalDetails: { certifiedFor: 'slaughter' }
        }).additionalDetails.certifiedFor
      ).toBe('Slaughter')
    })

    test('Should map unweanedAnimals yes to display label', () => {
      expect(
        mapNotificationToView({
          additionalDetails: { unweanedAnimals: 'yes' }
        }).additionalDetails.unweanedAnimals
      ).toBe('Yes')
    })

    test('Should map reasonForImport to display label', () => {
      expect(mapNotificationToView(notification).reasonForImport).toBe(
        'Internal market'
      )
    })

    test('Should map addresses', () => {
      const { addresses } = mapNotificationToView(notification)
      expect(addresses.consignor).toContain('Tampere Horse Transport')
      expect(addresses.consignee).toContain('Leicester Cattle Ltd')
      expect(addresses.importer).toContain('Leicester Cattle Ltd')
      expect(addresses.placeOfDestination).toContain(
        'Leicester Cattle Finishing Unit'
      )
    })

    test('Should map placeOfOrigin from flat placeOfOrigin operator field', () => {
      const placeOfOrigin = {
        name: 'Origin Farm',
        address: { addressLine1: '1 Farm Lane', country: 'Ireland' }
      }
      const { addresses } = mapNotificationToView({ placeOfOrigin })
      expect(addresses.placeOfOrigin).toContain('Origin Farm')
      expect(addresses.placeOfOrigin).toContain('Ireland')
    })

    test('Should map consignment from flat consignment field', () => {
      const consignment = {
        name: 'Animal and Plant Health Agency',
        address: { addressLine1: 'Woodham Lane', country: 'United Kingdom' }
      }
      const { addresses } = mapNotificationToView({ consignment })
      expect(addresses.consignment).toContain('Animal and Plant Health Agency')
      expect(addresses.consignment).toContain('United Kingdom')
    })

    test('Should map cphNumber', () => {
      expect(mapNotificationToView(notification).cphNumber).toBe('12/343/R783')
    })

    test('Should map transport details', () => {
      const { transport } = mapNotificationToView(notification)
      expect(transport.transporterName).toBe('Nordic Livestock Haulage Oy')
      expect(transport.approvalNumber).toBe('FITH-2016-7781')
      expect(transport.type).toBe('Commercial transporter')
      expect(transport.portOfEntry).toBe('Port of Dover GBDVR')
      expect(transport.arrivalDate).toBe('20 April 2026')
    })

    test('Should map documents with human-readable document type', () => {
      expect(mapNotificationToView(notification).documents).toEqual([
        {
          type: 'Intra-Trade Animal Health Certificate (ITAHC)',
          reference: 'DOC-001',
          validUntil: '31 December 2026',
          attachments: 'doc.pdf'
        }
      ])
    })
  })

  describe('when given an empty notification', () => {
    const viewModel = mapNotificationToView({})

    test('Should return Not provided for referenceNumber', () => {
      expect(viewModel.referenceNumber).toBe(NOT_PROVIDED)
    })

    test('Should return Not provided for dateCreated', () => {
      expect(viewModel.dateCreated).toBe(NOT_PROVIDED)
    })

    test('Should return Not provided for all origin fields', () => {
      expect(viewModel.origin).toEqual({
        countryOfOrigin: NOT_PROVIDED,
        regionOfConsignment: NOT_PROVIDED,
        internalReference: NOT_PROVIDED
      })
    })

    test('Should return Not provided for commodity name and empty species', () => {
      expect(viewModel.commodity.name).toBe(NOT_PROVIDED)
      expect(viewModel.commodity.species).toEqual([])
    })

    test('Should return Not provided for additionalDetails', () => {
      expect(viewModel.additionalDetails).toEqual({
        certifiedFor: NOT_PROVIDED,
        unweanedAnimals: NOT_PROVIDED
      })
    })

    test('Should return Not provided for reasonForImport', () => {
      expect(viewModel.reasonForImport).toBe(NOT_PROVIDED)
    })

    test('Should return Not provided for all address fields', () => {
      expect(viewModel.addresses).toEqual({
        placeOfOrigin: NOT_PROVIDED, // no placeOfOrigin operator set
        consignor: NOT_PROVIDED,
        consignee: NOT_PROVIDED,
        importer: NOT_PROVIDED,
        placeOfDestination: NOT_PROVIDED,
        consignment: NOT_PROVIDED
      })
    })

    test('Should return Not provided for cphNumber', () => {
      expect(viewModel.cphNumber).toBe(NOT_PROVIDED)
    })

    test('Should return Not provided for all transport fields', () => {
      expect(viewModel.transport).toEqual({
        transporterName: NOT_PROVIDED,
        transporterAddress: NOT_PROVIDED,
        type: NOT_PROVIDED,
        approvalNumber: NOT_PROVIDED,
        portOfEntry: NOT_PROVIDED,
        arrivalDate: NOT_PROVIDED
      })
    })

    test('Should return empty documents array', () => {
      expect(viewModel.documents).toEqual([])
    })
  })

  describe('reasonForImport label mapping', () => {
    test('Should map reEntry to display label', () => {
      expect(
        mapNotificationToView({ reasonForImport: 'reEntry' }).reasonForImport
      ).toBe('Re-entry')
    })

    test('Should pass through unknown reasonForImport values unchanged', () => {
      expect(
        mapNotificationToView({ reasonForImport: 'someOtherValue' })
          .reasonForImport
      ).toBe('someOtherValue')
    })
  })

  describe('requiresRegionCode label mapping', () => {
    test('Should map yes to Yes', () => {
      expect(
        mapNotificationToView({ origin: { requiresRegionCode: 'yes' } }).origin
          .regionOfConsignment
      ).toBe('Yes')
    })

    test('Should pass through unknown requiresRegionCode values unchanged', () => {
      expect(
        mapNotificationToView({ origin: { requiresRegionCode: 'unknown' } })
          .origin.regionOfConsignment
      ).toBe('unknown')
    })
  })

  describe('document type label mapping', () => {
    test('Should map VETERINARY_HEALTH_CERTIFICATE to display label', () => {
      expect(
        mapNotificationToView({
          documents: [{ type: 'VETERINARY_HEALTH_CERTIFICATE' }]
        }).documents[0].type
      ).toBe('Veterinary health certificate')
    })

    test('Should pass through unknown document type values unchanged', () => {
      expect(
        mapNotificationToView({ documents: [{ type: 'UNKNOWN_TYPE' }] })
          .documents[0].type
      ).toBe('UNKNOWN_TYPE')
    })
  })

  describe('commodity without code', () => {
    test('Should show name only when code is absent', () => {
      expect(
        mapNotificationToView({ commodity: { name: 'Fish' } }).commodity.name
      ).toBe('Fish')
    })
  })

  describe('formatAddress edge cases', () => {
    test('Should return entity name when entity has no address property', () => {
      expect(
        mapNotificationToView({ consignor: { name: 'Simple Name' } }).addresses
          .consignor
      ).toBe('Simple Name')
    })
  })

  describe('mapComplementToSpecies edge cases', () => {
    test('Should return empty species when complement has no species array', () => {
      expect(
        mapNotificationToView({
          commodity: {
            name: 'Cow',
            commodityComplement: [{ typeOfCommodity: 'Domestic' }]
          }
        }).commodity.species
      ).toEqual([])
    })
  })

  describe('status field', () => {
    test('Should return null when status is absent', () => {
      expect(mapNotificationToView({ referenceNumber: 'REF-001' }).status).toBe(
        null
      )
    })
  })
})
