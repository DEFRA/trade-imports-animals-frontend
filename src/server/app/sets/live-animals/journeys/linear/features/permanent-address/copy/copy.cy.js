// MACHINE-DRAFT Welsh — not reviewed by a translator. Do not ship user-facing without Welsh Language Standards sign-off.
export const copy = {
  title: 'Cyfeiriad parhaol',
  warning: 'Mae darparu cyfeiriad ffug yn weithred o dwyll',
  legend: 'Dewiswch gyfeiriad',
  identifierLine: (label, value) => `${label}: ${value}`,
  options: {
    placeOfDestination: 'Yr un fath â’r man cyrchfan (POD)',
    newAddress: 'Rhowch gyfeiriad newydd',
    newAddressHint:
      'Dyma le byddant yn aros ar ôl treulio 48 awr yn y man cyrchfan.'
  },
  address: {
    nameOrOrganisationName: 'Enw neu enw’r sefydliad',
    addressLine1: 'Llinell gyfeiriad 1',
    addressLine2: 'Llinell gyfeiriad 2 (dewisol)',
    townOrCity: 'Tref neu ddinas',
    county: 'Sir (dewisol)',
    postcode: 'Cod post neu god zip',
    email: 'Cyfeiriad e-bost',
    phone: 'Rhif ffôn'
  },
  addressHints: {
    phone: 'Ar gyfer rhifau rhyngwladol, cynhwyswch god y wlad'
  },
  errors: {
    nameOrOrganisationName: 'Rhowch enw neu enw sefydliad',
    addressLine1: 'Rhowch linell gyfeiriad 1',
    townOrCity: 'Rhowch dref neu ddinas',
    postcode: 'Rhowch god post neu god zip',
    email: 'Rhowch gyfeiriad e-bost',
    phone: 'Rhowch rif ffôn',
    placeOfDestinationUnknown: 'Ychwanegwch fan cyrchfan cyn i chi barhau',
    forAnimal: (message, animal) => `${message} ar gyfer ${animal}`
  },
  noAnimalsIdentified: {
    before: 'Ychwanegwch nifer yr anifeiliaid ar ',
    linkText: 'fanylion y gyflwyniad',
    after: ' cyn i chi barhau.'
  }
}
