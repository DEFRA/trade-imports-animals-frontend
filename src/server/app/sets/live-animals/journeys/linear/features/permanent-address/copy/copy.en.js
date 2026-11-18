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
  },
  errors: {
    nameOrOrganisationName: 'Enter a name or organisation name',
    addressLine1: 'Enter address line 1',
    townOrCity: 'Enter a town or city',
    postcode: 'Enter a postcode or Zip code',
    email: 'Enter an email address',
    phone: 'Enter a phone number',
    placeOfDestinationUnknown:
      'Add a place of destination before you can continue',
    forAnimal: (message, animal) => `${message} for ${animal}`
  },
  noAnimalsIdentified: {
    before: 'Add the number of animals on ',
    linkText: 'consignment details',
    after: ' before you can continue.'
  }
}
