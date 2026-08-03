export const copy = {
  title: 'Review your notification',
  continue: 'Continue',
  change: 'Change',
  missingAnswer: 'Add a missing answer',
  yesNo: { yes: 'Yes', no: 'No' },
  importTypes: {
    plants: 'Plants, plant products and other objects'
  },
  ctcOptions: {
    ADD_MRN_NOW: 'Yes – add MRN now',
    ADD_MRN_LATER: 'Yes – add MRN later',
    NO: 'No'
  },
  finishedOrPropagated: {
    FINISHED: 'Finished',
    PROPAGATED: 'Propagated'
  },
  cards: {
    aboutConsignment: {
      heading: 'About the consignment',
      rows: {
        importType: 'What are you importing?',
        internalReference: 'Internal reference',
        countryOfOrigin: 'Country of origin',
        countryOfConsignment: 'Country from where consigned',
        reasonForImport: 'Purpose of the consignment'
      }
    },
    commodities: {
      heading: 'Description of the goods',
      tables: {
        commodities: 'Commodities',
        species: 'Species',
        varieties: 'Varieties',
        measures: 'Commodity details'
      },
      columns: {
        line: 'Commodity',
        code: 'Commodity code',
        description: 'Description',
        genusAndSpecies: 'Genus and species',
        variety: 'Variety',
        varietyClass: 'Class',
        packages: 'Packages',
        packageType: 'Package type',
        quantity: 'Quantity',
        quantityType: 'Quantity type',
        netWeight: 'Net weight',
        controlledAtmosphere: 'Controlled atmosphere container',
        finishedOrPropagated: 'Finished or propagated',
        intendedForFinalUsers: 'Intended for final users',
        testAndTrial: 'Test and trial',
        action: 'Action'
      },
      commodity: (number) => `Commodity ${number}`,
      species: (number) => `Species ${number}`,
      changeCommodity: (number) => `commodity ${number}`
    },
    additionalDetails: {
      heading: 'Additional details',
      rows: {
        totalGrossWeight: 'Total gross weight',
        grossVolume: 'Gross volume',
        grossVolumeUnit: 'Gross volume unit',
        totalNetWeight: 'Total net weight',
        totalPackages: 'Total packages'
      }
    },
    transport: {
      heading: 'Transport to the Border Control Post',
      rows: {
        borderControlPost: 'Border Control Post',
        inspectionPremises: 'Inspection premises',
        meansOfTransport: 'Means of transport',
        transportIdentification: 'Transport identification',
        transportDocumentReference: 'Transport document reference',
        arrivalDate: 'Estimated arrival date',
        arrivalTime: 'Estimated arrival time',
        usesContainers: 'Using containers?',
        containerNumber: (number) => `Container ${number} number`,
        sealNumber: (number) => `Container ${number} seal number`,
        officialSeal: (number) => `Container ${number} official seal`
      }
    },
    goodsMovement: {
      heading: 'Goods movement services',
      rows: {
        commonTransitConvention: 'Using the Common Transit Convention (CTC)',
        movementReferenceNumber: 'Movement Reference Number (MRN)',
        usingGvms: 'Using the Goods Vehicle Movement Service (GVMS)'
      }
    },
    contact: {
      heading: 'Contact details',
      rows: {
        name: 'Name',
        email: 'Email address',
        telephone: 'Mobile number'
      }
    },
    nominatedContacts: {
      heading: 'Nominated contacts',
      empty: 'No nominated contacts added',
      columns: {
        name: 'Name',
        email: 'Email address',
        telephone: 'Mobile number',
        agent: 'Agent'
      },
      change: 'nominated contacts'
    },
    documents: {
      heading: 'Accompanying documents',
      columns: {
        type: 'Document type',
        reference: 'Document reference',
        issueDate: 'Date of issue'
      },
      change: 'accompanying documents'
    },
    traders: {
      heading: 'Traders',
      sameAsConsignee: "Same as the importer's address",
      rows: {
        importer: 'Importer',
        deliveryAddress: 'Delivery address',
        destinationName: 'Delivery address name',
        destinationAddressLine1: 'Delivery address line 1',
        destinationAddressLine2: 'Delivery address line 2',
        destinationAddressLine3: 'Delivery address line 3',
        destinationCity: 'Delivery town or city',
        destinationPostcode: 'Delivery postcode or ZIP code',
        destinationCountry: 'Delivery country',
        consignorName: 'Consignor or exporter name',
        consignorAddressLine1: 'Consignor address line 1',
        consignorAddressLine2: 'Consignor address line 2',
        consignorAddressLine3: 'Consignor address line 3',
        consignorCity: 'Consignor town or city',
        consignorPostcode: 'Consignor postcode or ZIP code',
        consignorTelephone: 'Consignor telephone number',
        consignorCountry: 'Consignor country',
        consignorEmail: 'Consignor email address',
        packerName: 'Packer name',
        packerAddressLine1: 'Packer address line 1',
        packerAddressLine2: 'Packer address line 2',
        packerAddressLine3: 'Packer address line 3',
        packerCity: 'Packer town or city',
        packerPostcode: 'Packer postcode or ZIP code',
        packerCountry: 'Packer country'
      }
    }
  }
}
