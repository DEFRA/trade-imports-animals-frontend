// Canned sample consignors filling the gap until the EUDPA-58 address book
// lands. Every value is drawn from a reserved range so no record can be
// mistaken for a real business: ZZ99 pseudo-postcodes, Ofcom's reserved drama
// telephone range and the RFC 2606 example.com domain.
const COUNTRY_CODES = Object.freeze([
  'FR',
  'NL',
  'ES',
  'IT',
  'DE',
  'PL',
  'BE',
  'PT',
  'MA',
  'TR',
  'GB-ENG',
  'GB-SCT'
])

const cannedConsignor = (country, index) => {
  const ordinal = index + 1
  const padded = String(ordinal).padStart(2, '0')
  return Object.freeze({
    id: `example-consignor-${padded}`,
    name: `Example Consignor ${padded} (sample data)`,
    telephone: `01632 9600${padded}`,
    email: `consignor${padded}@example.com`,
    address: Object.freeze({
      addressLine1: `${ordinal} Example Street`,
      addressLine2: 'Example Business Park',
      addressLine3: 'Example District',
      city: 'Example City',
      postcode: `ZZ99 ${padded}`,
      country
    })
  })
}

export const CANNED_CONSIGNORS = Object.freeze(
  COUNTRY_CODES.map(cannedConsignor)
)
