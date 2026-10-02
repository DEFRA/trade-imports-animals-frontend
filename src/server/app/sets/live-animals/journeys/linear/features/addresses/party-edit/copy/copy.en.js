// Field labels and error messages match the INS address book
// (trade-imports-ins-frontend features/address-book/copy), so an address reads
// and fails the same way in both places.
export const copy = {
  title: 'Edit address details',
  hint: 'Changes apply to this notification only. Your address book is not changed.',
  fields: {
    name: 'Name or organisation name',
    addressLine1: 'Address line 1',
    addressLine2: 'Address line 2 (optional)',
    townOrCity: 'Town or city',
    county: 'County (optional)',
    postcode: 'Postcode or Zip code',
    countryCode: 'Country',
    phone: 'Phone number',
    email: 'Email address'
  },
  phoneHint: 'For international numbers include the country code',
  countryPlaceholder: 'Select a country',
  save: 'Save changes',
  cancel: 'Cancel',
  errors: {
    name: {
      required: 'Enter a name',
      maxLength: (max) => `Name must be ${max} characters or fewer`
    },
    addressLine1: {
      required: 'Enter address line 1',
      maxLength: (max) => `Address line 1 must be ${max} characters or fewer`
    },
    addressLine2: {
      maxLength: (max) => `Address line 2 must be ${max} characters or fewer`
    },
    townOrCity: {
      required: 'Enter a town or city',
      maxLength: (max) => `Town or city must be ${max} characters or fewer`
    },
    county: {
      maxLength: (max) => `County must be ${max} characters or fewer`
    },
    postcode: {
      required: 'Enter a postcode',
      maxLength: (max) => `Postcode must be ${max} characters or fewer`
    },
    countryCode: {
      required: 'Enter a country'
    },
    phone: {
      required: 'Enter a telephone number',
      maxLength: (max) => `Telephone number must be ${max} characters or fewer`
    },
    email: {
      required: 'Enter an email address',
      format: 'Enter an email address in the correct format',
      maxLength: (max) => `Email address must be ${max} characters or fewer`
    }
  }
}
