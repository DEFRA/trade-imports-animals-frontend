const STREET_PARTS = ['addressLine1', 'addressLine2', 'addressLine3']
const LOCALITY_PARTS = ['townOrCity', 'county', 'postcode']
const streetLinesThenLocalityLine = (address, localityLineParts) =>
  [
    ...STREET_PARTS.map((part) => address[part]),
    localityLineParts.filter(Boolean).join(', ')
  ].filter(Boolean)

const localityParts = (address) => LOCALITY_PARTS.map((part) => address[part])

export const pickerAddressLines = (address) =>
  streetLinesThenLocalityLine(address, localityParts(address))

export const insetAddressLines = ({ address }) =>
  streetLinesThenLocalityLine(address, [
    ...localityParts(address),
    address.country
  ])
