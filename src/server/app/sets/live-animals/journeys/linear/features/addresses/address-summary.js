export const addressSummary = (address = {}) =>
  [
    'addressLine1',
    'addressLine2',
    'addressLine3',
    'townOrCity',
    'county',
    'postcode',
    'country'
  ]
    .map((part) => address[part])
    .filter(Boolean)
    .join(', ')
