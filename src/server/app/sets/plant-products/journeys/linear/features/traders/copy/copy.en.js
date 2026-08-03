export const copy = {
  tradersAddresses: {
    caption: 'Traders',
    heading: 'Importer, Packer, Delivery address and Consignor',
    importer: {
      heading: 'Importer',
      rows: {
        name: 'Name',
        address: 'Address',
        country: 'Country'
      }
    },
    packer: {
      heading: 'Packer (optional)',
      fields: {
        name: 'Name',
        addressLine1: 'Address line 1',
        addressLine2: 'Address line 2 (optional)',
        addressLine3: 'Address line 3 (optional)',
        city: 'Town or city',
        postcode: 'Postcode or ZIP code',
        country: 'Country'
      }
    },
    delivery: {
      heading: 'Delivery address',
      legend: "Is the delivery address the same as the importer's address?",
      options: {
        yes: 'Yes',
        no: 'No'
      },
      fields: {
        name: 'Delivery address name',
        addressLine1: 'Address line 1',
        addressLine2: 'Address line 2 (optional)',
        addressLine3: 'Address line 3 (optional)',
        city: 'Town or city',
        postcode: 'Postcode or ZIP code',
        country: 'Country'
      }
    },
    consignor: {
      heading: 'Consignor or exporter',
      notAdded: 'Not yet added',
      addLink: 'Add a consignor or exporter'
    },
    countryPlaceholder: 'Select a country',
    continue: 'Continue',
    errors: {
      destinationSameAsConsignee:
        "Select yes if the delivery address is the same as the importer's address",
      destinationName: 'Enter the delivery address name',
      destinationAddressLine1: 'Enter address line 1 of the delivery address',
      destinationCity: 'Enter the town or city of the delivery address',
      destinationPostcode: 'Enter the postcode or ZIP code',
      destinationCountry: 'Select the country of the delivery address'
    }
  }
}
