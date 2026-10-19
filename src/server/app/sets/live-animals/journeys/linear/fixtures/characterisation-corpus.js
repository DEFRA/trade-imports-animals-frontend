import { readFileSync } from 'node:fs'

const happyPath = JSON.parse(
  readFileSync(new URL('../flow/fixtures/happy-path.json', import.meta.url))
).values

const animalAddress = {
  name: 'Owner',
  address: {
    addressLine1: '8 Stable Close',
    addressLine2: 'Little Pasture',
    countryCode: 'GB'
  }
}

const commodityLine = ({
  speciesSelection = 'Bos taurus',
  numberOfAnimalsQuantity = '1',
  animalIdentifiers = [{ animalIdentifierEarTag: 'UK123456789012' }]
} = {}) => ({
  commoditySelection: '0102',
  speciesSelection,
  commodityType: '16',
  numberOfPackages: '1',
  numberOfAnimalsQuantity,
  animalIdentifiers
})

const comprehensive = {
  ...happyPath,
  referenceNumber: 'GBN-AG-26-ABC123',
  poApprovedReferenceNumber: 'GBN-AG-26-ABC123',
  internalReferenceNumber: '',
  destinationCountry: 'IE',
  portOfExit: 'GB DOV',
  exitDate: { day: '20', month: '12', year: '2026' },
  declaration: ['confirmed'],
  commodityLines: [
    commodityLine({
      numberOfAnimalsQuantity: '2',
      animalIdentifiers: [
        {
          animalIdentifierEarTag: 'UK123456789012',
          animalIdentifierPassport: 'UK123456789',
          animalIdentifierTattoo: 'AB1234'
        },
        {
          horseName: 'Silver',
          animalIdentifierMicrochip: '900123456789012',
          permanentAddress: animalAddress
        }
      ]
    }),
    commodityLine({
      speciesSelection: 'Bison bison',
      animalIdentifiers: [
        {
          animalIdentifierEarTag: 'UK000000000001'
        }
      ]
    })
  ],
  documents: [
    {
      ...happyPath.documents[0],
      uploadId: 'upload-001',
      filename: 'itahc-certificate.pdf'
    },
    {
      accompanyingDocumentType: 'AIR_WAYBILL',
      accompanyingDocumentAttachmentType: 'PNG',
      accompanyingDocumentReference: 'AWB-42',
      accompanyingDocumentDateOfIssue: {
        day: '1',
        month: '11',
        year: '2025'
      },
      uploadId: 'upload-002',
      filename: 'air-waybill.png'
    }
  ]
}

const gateOpen = {
  reasonForImport: 'internalMarket',
  purposeInInternalMarket: 'breeding',
  commodityLines: [commodityLine()]
}

export const characterisationCorpus = [
  {
    name: 'comprehensive',
    answers: comprehensive
  },
  {
    name: 'partially-filled-record',
    answers: {
      countryOfOrigin: '',
      commodityLines: [
        {
          commoditySelection: '0102',
          animalIdentifiers: [{}]
        }
      ],
      documents: [
        {
          accompanyingDocumentType: 'ITAHC',
          uploadId: 'upload-partial',
          filename: 'partial.pdf'
        }
      ]
    }
  },
  {
    name: 'completely-empty-started-record',
    answers: {
      documents: [{}]
    }
  },
  {
    name: 'gate-open',
    answers: gateOpen
  },
  {
    name: 'gate-flipped',
    answers: {
      ...gateOpen,
      reasonForImport: 'transit',
      commodityLines: [
        {
          ...gateOpen.commodityLines[0],
          commoditySelection: '01063300',
          speciesSelection: 'Struthio',
          commodityType: '2'
        }
      ]
    }
  }
]
