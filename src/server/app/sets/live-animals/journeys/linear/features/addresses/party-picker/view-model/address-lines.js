const STREET_PARTS = ['addressLine1', 'addressLine2', 'addressLine3']
const LOCALITY_PARTS = ['townOrCity', 'county', 'postcode']
const ADDRESS_PARTS = [...STREET_PARTS, ...LOCALITY_PARTS]

export const addressText = (address) =>
  ADDRESS_PARTS.map((part) => address[part])
    .filter(Boolean)
    .join(', ')

export const detailLines = (record) =>
  [
    record.name,
    ...ADDRESS_PARTS.map((part) => record.address[part]),
    record.address.country,
    record.address.phone,
    record.address.email
  ].filter(Boolean)

export const insetAddressLines = ({ address }) =>
  [
    ...STREET_PARTS.map((part) => address[part]),
    [...LOCALITY_PARTS.map((part) => address[part]), address.country]
      .filter(Boolean)
      .join(', ')
  ].filter(Boolean)
