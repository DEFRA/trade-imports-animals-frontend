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

export const validCommercialTransporter = {
  approvalNumber: 'UK/BELF/T2/00104115',
  nameOrOrganisationName: 'Lough Neagh Livestock Ltd',
  addressLine1: '4 Quay Road',
  addressLine2: 'Unit 3',
  townOrCity: 'Belfast',
  county: 'County Antrim',
  postcode: 'BT1 3LG',
  email: 'movements@lough-neagh.example.com',
  phone: '+44 28 9000 0111'
}

const fillTransporterForm = async (page, fields) => {
  for (const [field, value] of Object.entries(fields)) {
    const control = page.locator(`#${field}`)
    if (field === 'country') {
      await control.selectOption(value)
    } else {
      await control.fill(value)
    }
  }
}

export const fillCommercialTransporter = (
  page,
  transporter = validCommercialTransporter
) => fillTransporterForm(page, transporter)

export const validPrivateTransporter = {
  nameOrOrganisationName: 'Jean Dupont',
  addressLine1: '10 Rue de la Ferme',
  addressLine2: 'Bâtiment 2',
  townOrCity: 'Calais',
  county: 'Pas-de-Calais',
  postcode: '62100',
  country: 'France',
  phone: '+33 3 21 00 00 00',
  email: 'jean.dupont@example.fr'
}

export const fillPrivateTransporter = (
  page,
  transporter = validPrivateTransporter
) => fillTransporterForm(page, transporter)
