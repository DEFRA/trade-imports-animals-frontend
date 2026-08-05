export const copy = {
  countryOfOrigin: {
    title: 'Origin of the plants, plant product or other objects',
    caption: 'About the consignment',
    country: {
      label: 'Country of origin',
      placeholder: 'Select a country',
      ukGroupLabel: 'United Kingdom of Great Britain and Northern Ireland'
    },
    errors: {
      countryRequired:
        'Select the country of origin of plants, plant product or other objects'
    }
  },
  originOfImport: {
    pageTitle: 'Origin of the import',
    caption: 'About the consignment',
    heading: 'Origin of the import',
    countryOfConsignment: {
      label: 'Country from where consigned',
      placeholder: 'Select a country'
    },
    internalReference: {
      label: 'Add a reference number for this consignment (optional)',
      hint: 'This can be whatever internal reference you use for the consignment.'
    },
    errors: {
      countryOfConsignmentRequired: 'Select the country from where consigned',
      internalReferenceMaxLength:
        'Internal reference number must be 30 characters or fewer'
    }
  }
}
