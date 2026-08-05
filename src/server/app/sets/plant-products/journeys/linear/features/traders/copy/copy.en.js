export const copy = {
  consignorCreate: {
    pageTitle: 'Add consignor or exporter',
    heading: 'Add consignor or exporter',
    legend: 'Consignor or exporter',
    fields: {
      consignorName: { label: 'Consignor or exporter name' },
      consignorAddressLine1: { label: 'Address line 1' },
      consignorAddressLine2: { label: 'Address line 2 (optional)' },
      consignorAddressLine3: { label: 'Address line 3 (optional)' },
      consignorCity: { label: 'City or town' },
      consignorPostcode: { label: 'Postcode or ZIP code (optional)' },
      consignorTelephone: { label: 'Telephone number' },
      consignorCountry: {
        label: 'Country',
        placeholder: 'Please select your country'
      },
      consignorEmail: { label: 'Email address' }
    },
    errors: {
      consignorName: {
        required: 'Enter a consignor or exporter name',
        max: 'Consignor or exporter name must be 255 characters or fewer'
      },
      consignorAddressLine1: {
        required: 'Enter an address line 1',
        max: 'Address line 1 must be 255 characters or fewer'
      },
      consignorAddressLine2: {
        max: 'Address line 2 must be 255 characters or fewer'
      },
      consignorAddressLine3: {
        max: 'Address line 3 must be 255 characters or fewer'
      },
      consignorCity: {
        required: 'Enter a city or town',
        max: 'City or town must be 58 characters or fewer'
      },
      consignorPostcode: {
        max: 'Postcode or ZIP code must be 32 characters or fewer'
      },
      consignorTelephone: {
        required: 'Enter a telephone number',
        max: 'Telephone number must be 30 characters or fewer'
      },
      consignorCountry: { required: 'Select a country' },
      consignorEmail: {
        required: 'Enter an email address',
        format:
          'Enter an email address in the correct format, like name@example.com',
        max: 'Email address must be 255 characters or fewer'
      }
    },
    continueLabel: 'Save and continue'
  },
  consignorPicker: {
    pageTitle: 'Consignor or exporter',
    caption: 'Traders',
    description:
      'Select the consignor or exporter for this notification, or add a new one.',
    noSaved: 'You have not saved any consignors or exporters yet.',
    noMatches: 'No consignors or exporters match your search.',
    search: {
      label: 'Search',
      hint: 'Name, address or country',
      button: 'Search'
    },
    resultsCaption: (shown, total) =>
      `Showing ${shown} of ${total} consignors or exporters`,
    table: {
      selectHidden: 'Select',
      name: 'Name',
      address: 'Address',
      country: 'Country',
      actionsHidden: 'Actions'
    },
    selectRowPrefix: 'Select',
    viewDetails: 'View details',
    viewDetailsFor: 'for',
    selectedPrefix: 'Selected consignor or exporter:',
    errorPrefix: 'Error:',
    saveAndContinue: 'Save and continue',
    addNew: 'Add a consignor or exporter',
    errors: { required: 'Select a consignor or exporter from the list' }
  },
  consignorConfirmation: {
    pageTitle: 'The consignor or exporter has been created',
    panelTitle: 'The consignor or exporter has been created',
    continueLabel: 'Add to notification'
  },
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
