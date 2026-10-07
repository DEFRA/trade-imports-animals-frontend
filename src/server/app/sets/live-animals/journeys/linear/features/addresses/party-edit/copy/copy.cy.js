// MACHINE-DRAFT Welsh — not reviewed by a translator. Do not ship user-facing without Welsh Language Standards sign-off.
export const copy = {
  title: 'Golygu manylion cyfeiriad',
  hint: "Mae newidiadau'n berthnasol i'r hysbysiad hwn yn unig. Nid yw eich llyfr cyfeiriadau yn newid.",
  fields: {
    name: 'Enw neu enw’r sefydliad',
    addressLine1: 'Llinell gyfeiriad 1',
    addressLine2: 'Llinell gyfeiriad 2 (dewisol)',
    townOrCity: 'Tref neu ddinas',
    county: 'Sir (dewisol)',
    postcode: 'Cod post neu god zip',
    countryCode: 'Gwlad',
    phone: 'Rhif ffôn',
    email: 'Cyfeiriad e-bost'
  },
  phoneHint: 'Ar gyfer rhifau rhyngwladol, cynhwyswch god y wlad',
  countryPlaceholder: 'Dewiswch wlad',
  save: 'Cadw’r newidiadau',
  cancel: 'Canslo',
  errors: {
    name: {
      required: 'Rhowch enw',
      maxLength: (max) => `Rhaid i’r enw fod yn ${max} nod neu lai`
    },
    addressLine1: {
      required: 'Rhowch linell gyfeiriad 1',
      maxLength: (max) => `Rhaid i linell gyfeiriad 1 fod yn ${max} nod neu lai`
    },
    addressLine2: {
      maxLength: (max) => `Rhaid i linell gyfeiriad 2 fod yn ${max} nod neu lai`
    },
    townOrCity: {
      required: 'Rhowch dref neu ddinas',
      maxLength: (max) => `Rhaid i’r dref neu ddinas fod yn ${max} nod neu lai`
    },
    county: {
      maxLength: (max) => `Rhaid i’r sir fod yn ${max} nod neu lai`
    },
    postcode: {
      required: 'Rhowch god post',
      maxLength: (max) => `Rhaid i’r cod post fod yn ${max} nod neu lai`
    },
    countryCode: {
      required: 'Rhowch wlad'
    },
    phone: {
      required: 'Rhowch rif ffôn',
      maxLength: (max) => `Rhaid i’r rhif ffôn fod yn ${max} nod neu lai`
    },
    email: {
      required: 'Rhowch gyfeiriad e-bost',
      format: 'Rhowch gyfeiriad e-bost yn y fformat cywir',
      maxLength: (max) => `Rhaid i’r cyfeiriad e-bost fod yn ${max} nod neu lai`
    }
  }
}
