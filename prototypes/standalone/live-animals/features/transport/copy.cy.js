// MACHINE-DRAFT Welsh — not reviewed by a translator. Do not ship user-facing without Welsh Language Standards sign-off.
export const copy = {
  portOfEntry: {
    title: 'Manylion cyrraedd',
    arrivalDate: {
      label: 'Dyddiad cyrraedd y porthladd mynediad',
      hint: 'Y dyddiad cyrraedd disgwyliedig yn y porthladd mynediad. Er enghraifft, 27/3/2026'
    },
    port: {
      label: 'Porthladd mynediad',
      hint: 'Dewiswch ble bydd y cludwr yn dod i mewn gyda’r llwyth. Dechreuwch deipio i chwilio yn ôl enw neu god y porthladd neu’r maes awyr.',
      placeholder: 'Dewiswch borthladd mynediad'
    },
    means: {
      legend: 'Cyfrwng cludo i’r porthladd mynediad',
      options: {
        Airplane: 'Awyren',
        Railway: 'Rheilffordd',
        'Road Vehicle': 'Cerbyd ffordd',
        Vessel: 'Llong'
      }
    },
    identification: {
      label: 'Adnabod y cludiant',
      hint: 'I adnabod y cyfrwng cludo, rhowch (un o’r canlynol): rhif hediad; rhif trên; rhif cofrestru cerbyd ffordd; enw llong (ar gyfer fferïau, rhif cofrestru’r cerbyd ffordd hefyd)'
    },
    documentReference: {
      label: 'Cyfeirnod dogfen cludo',
      hint: 'Rhowch y cyfeirnod ar y bil llwytho awyr, y bil llwytho, y bil llwytho môr, y nodyn llwyth ffordd (CMR) neu ddogfen gludo arall.'
    },
    errors: {
      arrivalDateInvalid: 'Rhowch ddyddiad cyrraedd go iawn',
      identificationMaxLength:
        'Rhaid i adnabod y cludiant fod yn 58 nod neu lai',
      documentReferenceMaxLength:
        'Rhaid i gyfeirnod y ddogfen gludo fod yn 58 nod neu lai'
    }
  },
  transitCountries: {
    title: 'Drwy ba wledydd y bydd y llwyth yn teithio?',
    betweenCountries:
      'Gwledydd y bydd y llwyth yn teithio drwyddynt yw’r gwledydd rhwng y wlad tarddiad a’r wlad gyrchfan.',
    excludesUk: 'Nid yw hyn yn cynnwys y Deyrnas Unedig.',
    enterAll: {
      label: 'Rhowch bob gwlad',
      hint: 'Gallwch ychwanegu hyd at 12 gwlad'
    },
    countryLabel: 'Gwlad',
    placeholder: 'Dewiswch wlad',
    addAnother: 'Ychwanegu gwlad arall',
    errors: {
      fromList: 'Dewiswch wledydd o’r rhestr',
      maxCountries: (max) => `Dewiswch hyd at ${max} gwlad`
    }
  },
  transporters: {
    title: 'Cludwr',
    legend: 'Pa fath o gludwr fydd yn symud yr anifeiliaid?',
    hint: 'Byddwn yn gofyn am fanylion y cludwr nesaf.',
    options: {
      Commercial: {
        text: 'Masnachol',
        hint: 'Busnes sydd wedi’i gymeradwyo i gludo anifeiliaid — byddwch yn dewis un o restr'
      },
      Private: {
        text: 'Preifat',
        hint: 'Chi neu unigolyn arall sy’n symud yr anifeiliaid — byddwch yn rhoi eu cyfeiriad'
      }
    }
  },
  transportersSelect: {
    title: 'Chwilio am gludwr masnachol cymeradwy',
    hint: 'Mae dewis cludwr yn copïo eu henw, eu cyfeiriad a’u rhif cymeradwyo i’r hysbysiad hwn.',
    optionHint: (address, approvalNumber) =>
      `${address} — rhif cymeradwyo ${approvalNumber}`,
    errors: {
      transporterRequired: 'Dewiswch gludwr o’r rhestr'
    }
  },
  privateTransporterDetails: {
    title: 'Manylion y cludwr preifat',
    intro:
      'Rhowch enw a chyfeiriad y cludwr preifat sy’n symud yr anifeiliaid.',
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
