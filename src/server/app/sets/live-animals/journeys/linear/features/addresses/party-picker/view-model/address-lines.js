const ADDRESS_PARTS = [
  'addressLine1',
  'addressLine2',
  'addressLine3',
  'townOrCity',
  'county',
  'postalOrZipCode'
]

export const addressText = (address) =>
  ADDRESS_PARTS.map((part) => address[part])
    .filter(Boolean)
    .join(', ')

export const detailLines = (record) =>
  [
    record.name,
    ...ADDRESS_PARTS.map((part) => record.address[part]),
    record.address.country,
    record.address.telephoneNumber,
    record.address.emailAddress
  ].filter(Boolean)
