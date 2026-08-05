export const copy = {
  hub: {
    title: 'Consignment addresses',
    warning: 'Providing a false address is an act of fraud.',
    notAddedYet: 'Not added yet',
    change: 'Change',
    add: 'Add',
    continueButton: 'Continue',
    cph: {
      title: 'County Parish Holding number (CPH)',
      hint: 'The County Parish Holding (CPH) number identifies the holding where the animals will be kept.'
    }
  },
  parties: {
    placeOfOrigin: {
      title: 'Place of origin',
      hint: 'The address where the animals begin their journey to Great Britain',
      error: 'Select a place of origin from the list'
    },
    consignor: {
      title: 'Consignor or exporter',
      hint: 'This is the sender of the consignment.',
      error: 'Select a consignor from the list'
    },
    consignee: {
      title: 'Consignee',
      hint: 'This is the receiver or buyer of the consignment being shipped or transported.',
      error: 'Select a consignee from the list'
    },
    importer: {
      title: 'Importer',
      hint: 'This is usually the same as the consignee. You can select a different person if needed.',
      error: 'Select an importer from the list'
    },
    placeOfDestination: {
      title: 'Place of destination',
      hint: 'This is where the animals will be unloaded and accommodated for at least 48 hours. If a health certificate is required, it will show this address.',
      error: 'Select a place of destination from the list'
    }
  },
  picker: {
    caption: 'Consignment addresses',
    search: {
      label: 'Search',
      hint: 'Name, address or country',
      button: 'Search'
    },
    selectedAddressPrefix: 'Selected address:',
    errorPrefix: 'Error:',
    noMatches: 'No addresses match your search.',
    resultsCaption: (shown, total) => `Showing ${shown} of ${total} addresses`,
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
    saveAndContinue: 'Save and continue',
    addNewAddress: 'Add a new address'
  },
  createAddress: {
    title: 'Add a new address',
    intro: 'Enter the name and address to add to this notification.',
    fields: {
      nameOrOrganisationName: 'Name or organisation name',
      addressLine1: 'Address line 1',
      addressLine2: 'Address line 2 (optional)',
      townOrCity: 'Town or city',
      county: 'County (optional)',
      postalOrZipCode: 'Postal or zip code',
      country: 'Country',
      telephoneNumber: 'Telephone number',
      emailAddress: 'Email address'
    },
    countryPlaceholder: 'Select a country',
    saveAndContinue: 'Save and continue',
    errors: {
      nameRequired: 'Enter a name or organisation name',
      addressLine1Required: 'Enter address line 1',
      townOrCityRequired: 'Enter a town or city',
      postalOrZipCodeRequired: 'Enter a postal or zip code',
      countryRequired: 'Select a country',
      telephoneRequired: 'Enter a telephone number',
      emailRequired: 'Enter an email address',
      nameMaxLength: 'Name or organisation name must be 255 characters or less',
      addressLine1MaxLength: 'Address line 1 must be 255 characters or less',
      addressLine2MaxLength: 'Address line 2 must be 255 characters or less',
      townOrCityMaxLength: 'Town or city must be 100 characters or less',
      countyMaxLength: 'County must be 100 characters or less',
      postalOrZipCodeMaxLength:
        'Postal or zip code must be 12 characters or less',
      countryFromList: 'Select a country from the list',
      telephoneMaxLength: 'Telephone number must be 20 characters or less',
      emailMaxLength: 'Email address must be 254 characters or less'
    }
  }
}
