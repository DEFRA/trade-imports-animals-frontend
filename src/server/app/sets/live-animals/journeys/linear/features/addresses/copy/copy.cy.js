// MACHINE-DRAFT Welsh — not reviewed by a translator. Do not ship user-facing without Welsh Language Standards sign-off.
export const copy = {
  hub: {
    title: 'Cyfeiriadau’r llwyth',
    warning: 'Mae darparu cyfeiriad ffug yn weithred o dwyll.',
    notAddedYet: 'Heb ei ychwanegu eto',
    change: 'Newid',
    add: 'Ychwanegu',
    continueButton: 'Parhau',
    cph: {
      title: 'Rhif Daliad Plwyf Sirol (CPH)',
      hint: 'Mae’r rhif Daliad Plwyf Sirol (CPH) yn adnabod y daliad lle bydd yr anifeiliaid yn cael eu cadw.'
    }
  },
  parties: {
    placeOfOrigin: {
      title: 'Man tarddiad',
      hint: 'Y cyfeiriad lle mae’r anifeiliaid yn dechrau eu taith i Brydain Fawr',
      error: 'Dewiswch fan tarddiad o’r rhestr'
    },
    consignor: {
      title: 'Anfonwr neu allforiwr',
      hint: 'Dyma anfonwr y llwyth.',
      error: 'Dewiswch anfonwr o’r rhestr'
    },
    consignee: {
      title: 'Derbynnydd',
      hint: 'Dyma dderbynnydd neu brynwr y llwyth sy’n cael ei gludo neu ei drosglwyddo.',
      error: 'Dewiswch dderbynnydd o’r rhestr'
    },
    importer: {
      title: 'Mewnforiwr',
      hint: 'Fel arfer, yr un un â’r derbynnydd. Gallwch ddewis person gwahanol os oes angen.',
      error: 'Dewiswch fewnforiwr o’r rhestr'
    },
    placeOfDestination: {
      title: 'Man cyrchfan',
      hint: 'Dyma lle bydd yr anifeiliaid yn cael eu dadlwytho a’u lletya am o leiaf 48 awr. Os oes angen tystysgrif iechyd, bydd yn dangos y cyfeiriad hwn.',
      error: 'Dewiswch fan cyrchfan o’r rhestr'
    }
  },
  picker: {
    caption: 'Cyfeiriadau’r llwyth',
    search: {
      label: 'Chwilio',
      hint: 'Enw, cyfeiriad neu wlad',
      button: 'Chwilio'
    },
    selectedAddressPrefix: 'Cyfeiriad a ddewiswyd:',
    errorPrefix: 'Gwall:',
    noMatches: 'Nid oes unrhyw gyfeiriadau’n cyfateb i’ch chwiliad.',
    resultsCaption: (shown, total) => `Yn dangos ${shown} o ${total} cyfeiriad`,
    table: {
      selectHidden: 'Dewis',
      name: 'Enw',
      address: 'Cyfeiriad',
      country: 'Gwlad',
      actionsHidden: 'Camau gweithredu'
    },
    selectRowPrefix: 'Dewis',
    viewDetails: 'Gweld manylion',
    viewDetailsFor: 'ar gyfer',
    saveAndContinue: 'Cadw a pharhau',
    addNewAddress: 'Ychwanegu cyfeiriad newydd'
  },
  createAddress: {
    title: 'Ychwanegu cyfeiriad newydd',
    intro: 'Rhowch yr enw a’r cyfeiriad i’w hychwanegu at yr hysbysiad hwn.',
    fields: {
      nameOrOrganisationName: 'Enw neu enw’r sefydliad',
      addressLine1: 'Llinell gyfeiriad 1',
      addressLine2: 'Llinell gyfeiriad 2 (dewisol)',
      townOrCity: 'Tref neu ddinas',
      county: 'Sir (dewisol)',
      postalOrZipCode: 'Cod post neu god zip',
      country: 'Gwlad',
      telephoneNumber: 'Rhif ffôn',
      emailAddress: 'Cyfeiriad e-bost'
    },
    countryPlaceholder: 'Dewiswch wlad',
    saveAndContinue: 'Cadw a pharhau',
    errors: {
      nameRequired: 'Rhowch enw neu enw sefydliad',
      addressLine1Required: 'Rhowch linell gyfeiriad 1',
      townOrCityRequired: 'Rhowch dref neu ddinas',
      postalOrZipCodeRequired: 'Rhowch god post neu god zip',
      countryRequired: 'Dewiswch wlad',
      telephoneRequired: 'Rhowch rif ffôn',
      emailRequired: 'Rhowch gyfeiriad e-bost',
      nameMaxLength: 'Rhaid i’r enw neu enw’r sefydliad fod yn 255 nod neu lai',
      addressLine1MaxLength:
        'Rhaid i linell gyfeiriad 1 fod yn 255 nod neu lai',
      addressLine2MaxLength:
        'Rhaid i linell gyfeiriad 2 fod yn 255 nod neu lai',
      townOrCityMaxLength: 'Rhaid i’r dref neu ddinas fod yn 100 nod neu lai',
      countyMaxLength: 'Rhaid i’r sir fod yn 100 nod neu lai',
      postalOrZipCodeMaxLength:
        'Rhaid i’r cod post neu’r cod zip fod yn 12 nod neu lai',
      countryFromList: 'Dewiswch wlad o’r rhestr',
      telephoneMaxLength: 'Rhaid i’r rhif ffôn fod yn 20 nod neu lai',
      emailMaxLength: 'Rhaid i’r cyfeiriad e-bost fod yn 254 nod neu lai'
    }
  }
}
