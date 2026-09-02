export const copy = {
  title: 'Origin of the import',
  country: {
    label: 'Country of origin',
    hint: 'Start typing to search for a country.',
    placeholder: 'Select a country',
    noResults: 'No countries found'
  },
  regionRequirement: {
    legend: 'Does the consignment have a region of origin code?',
    hint: 'If a region of origin code is required it will be shown on your health certificate.',
    yes: 'Yes',
    no: 'No'
  },
  regionCode: {
    label: 'Enter the region of origin code',
    hint: 'Enter up to 5 characters.'
  },
  internalReference: {
    label: 'Your internal reference for this consignment (optional)',
    hint: 'Enter any internal reference you want to use to identify this consignment, or leave blank.'
  },
  errors: {
    countryRequired: 'Select the country where the animal originates from',
    regionCodeRequired: 'Enter the region of origin code',
    regionCodeMaxLength: 'Region of origin code must be 5 characters or less',
    internalReferenceMaxLength:
      'Internal reference must be 58 characters or less',
    internalReferencePattern:
      'Internal reference must only contain letters, numbers and underscores'
  }
}
