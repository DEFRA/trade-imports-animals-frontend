const ADDRESS_LINE_PARTS = [
  'addressLine1',
  'addressLine2',
  'addressLine3',
  'townOrCity',
  'county',
  'postcode',
  'country'
]

export const addressSummary = (address = {}) =>
  ADDRESS_LINE_PARTS.map((part) => address[part])
    .filter(Boolean)
    .join(', ')
