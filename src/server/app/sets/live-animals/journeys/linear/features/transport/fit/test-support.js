const MAX_NAME_OR_ADDRESS_LINE_LENGTH = 255
const MAX_TOWN_OR_COUNTY_LENGTH = 100
const MAX_POSTAL_OR_ZIP_CODE_LENGTH = 12

export const addressOverLengthValidations = [
  [
    'name or organisation name over 255 characters',
    'nameOrOrganisationName',
    'N'.repeat(MAX_NAME_OR_ADDRESS_LINE_LENGTH + 1),
    'nameMaxLength'
  ],
  [
    'address line 1 over 255 characters',
    'addressLine1',
    'A'.repeat(MAX_NAME_OR_ADDRESS_LINE_LENGTH + 1),
    'addressLine1MaxLength'
  ],
  [
    'address line 2 over 255 characters',
    'addressLine2',
    'B'.repeat(MAX_NAME_OR_ADDRESS_LINE_LENGTH + 1),
    'addressLine2MaxLength'
  ],
  [
    'town or city over 100 characters',
    'townOrCity',
    'T'.repeat(MAX_TOWN_OR_COUNTY_LENGTH + 1),
    'townOrCityMaxLength'
  ],
  [
    'county over 100 characters',
    'county',
    'C'.repeat(MAX_TOWN_OR_COUNTY_LENGTH + 1),
    'countyMaxLength'
  ],
  [
    'postcode or Zip code over 12 characters',
    'postcode',
    'P'.repeat(MAX_POSTAL_OR_ZIP_CODE_LENGTH + 1),
    'postcodeMaxLength'
  ]
]

const MAX_TELEPHONE_LENGTH = 20
const MAX_EMAIL_LENGTH = 254
const EXAMPLE_EMAIL_DOMAIN = '@example.com'

export const contactOverLengthValidations = [
  [
    'email address over 254 characters',
    'email',
    `${'e'.repeat(MAX_EMAIL_LENGTH + 1 - EXAMPLE_EMAIL_DOMAIN.length)}${EXAMPLE_EMAIL_DOMAIN}`,
    'emailMaxLength'
  ],
  [
    'phone number over 20 characters',
    'phone',
    '1'.repeat(MAX_TELEPHONE_LENGTH + 1),
    'telephoneMaxLength'
  ]
]
