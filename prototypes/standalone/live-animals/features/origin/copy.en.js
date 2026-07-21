export const copy = {
  title: 'Origin of the import',
  country: {
    label: 'Country of origin',
    placeholder: 'Select a country'
  },
  regionRequirement: {
    legend: 'Does the consignment have a region of origin code?',
    hint: 'If a region of origin code is required it will be shown on your health certificate.',
    yes: 'Yes',
    no: 'No'
  },
  regionCode: {
    label: 'Region of origin code',
    hint: 'For example, FR-75'
  },
  internalReference: {
    label: 'Your internal reference for this consignment (optional)',
    hint: 'Enter any internal reference you want to use to identify this consignment, or leave blank.'
  },
  errors: {
    countryRequired: 'Select the country where the animal originates from',
    regionCodeMaxLength: 'Region of origin code must be 5 characters or less',
    internalReferenceMaxLength:
      'Internal reference must be 58 characters or less',
    internalReferencePattern:
      'Internal reference must only contain letters and numbers'
  }
}
