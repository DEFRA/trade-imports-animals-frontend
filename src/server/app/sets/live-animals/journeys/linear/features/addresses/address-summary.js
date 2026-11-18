const ADDRESS_LINE_PARTS = [
  'addressLine1',
  'addressLine2',
  'addressLine3',
  'townOrCity',
  'county',
  'postcode',
  'country'
]

const lineOf = (address, parts) =>
  parts
    .map((part) => address[part])
    .filter(Boolean)
    .join(', ')

export const addressSummary = (address = {}) =>
  lineOf(address, ADDRESS_LINE_PARTS)

export const addressSummaryEndingAtPostcode = (address = {}) =>
  lineOf(address, ADDRESS_LINE_PARTS.slice(0, -1))
