import { countryLabel } from '../../../../../../services/reference/countries.js'

const ADDRESS_PARTS = [
  'addressLine1',
  'addressLine2',
  'addressLine3',
  'city',
  'postcode'
]

export const addressText = (address) =>
  ADDRESS_PARTS.map((part) => address?.[part])
    .filter((part) => part)
    .join(', ')

// The stored value is the ISO code; only the rendered line shows the label.
export const countryText = (code) => (code ? (countryLabel(code) ?? code) : '')

export const detailLines = (record) =>
  [
    record.name,
    ...ADDRESS_PARTS.map((part) => record.address?.[part]),
    countryText(record.address?.country),
    record.telephone,
    record.email
  ].filter((line) => line)
