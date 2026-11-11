export const copy = {
  title: 'Permanent address',
  warning: 'Providing a false address is an act of fraud',
  legend: 'Select an address',
  identifierLine: (label, value) => `${label}: ${value}`,
  options: {
    placeOfDestination: 'Same as the place of destination (POD)',
    newAddress: 'Enter a new address',
    newAddressHint:
      'This is where they will stay after spending 48 hours at the place of destination.'
  },
  address: {
    nameOrOrganisationName: 'Name or organisation name',
    addressLine1: 'Address line 1',
    addressLine2: 'Address line 2 (optional)',
    townOrCity: 'Town or city',
    county: 'County (optional)',
    postcode: 'Postcode or Zip code',
    email: 'Email address',
    phone: 'Phone number'
  },
  addressHints: {
    phone: 'For international numbers include the country code'
  }
}
