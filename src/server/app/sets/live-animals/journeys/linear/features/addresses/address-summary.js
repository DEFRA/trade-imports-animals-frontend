const ADDRESS_PARTS_TO_POSTCODE = [
  'addressLine1',
  'addressLine2',
  'addressLine3',
  'townOrCity',
  'county',
  'postcode'
]
const ADDRESS_LINE_PARTS = [...ADDRESS_PARTS_TO_POSTCODE, 'country']

const lineOf = (address, parts) =>
  parts
    .map((part) => address[part])
    .filter(Boolean)
    .join(', ')

export const addressSummary = (address = {}) =>
  lineOf(address, ADDRESS_LINE_PARTS)

export const addressSummaryEndingAtPostcode = (address = {}) =>
  lineOf(address, ADDRESS_PARTS_TO_POSTCODE)
