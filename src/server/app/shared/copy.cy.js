// MACHINE-DRAFT Welsh — not reviewed by a translator. Do not ship user-facing without Welsh Language Standards sign-off.
export const copy = {
  layout: {
    serviceName: 'Gwasanaeth hysbysu mewnforio',
    errorTitlePrefix: 'Gwall: ',
    back: 'Yn ôl',
    phaseBanner: {
      tag: 'Alffa',
      bodyPrefix: "Gwasanaeth newydd yw hwn. Helpwch ni i'w wella —",
      feedbackLinkText: 'rhowch eich adborth drwy e-bost'
    },
    serviceNavigation: {
      menuButton: 'Dewislen',
      dashboard: 'Dangosfwrdd',
      addressBook: 'Llyfr cyfeiriadau',
      manageAccount: 'Rheoli cyfrif',
      logOut: 'Allgofnodi'
    },
    breadcrumbs: {
      serviceHome: 'Eich hysbysiadau'
    },
    footer: {
      privacy: 'Preifatrwydd',
      cookies: 'Cwcis',
      accessibility: 'Datganiad hygyrchedd'
    }
  },
  errorSummary: {
    title: 'Mae problem'
  },
  recoverableError: {
    title: 'Mae problem',
    body: "Mae'n ddrwg gennym, mae problem gyda'r gwasanaeth. Mae eich atebion ar y dudalen hon wedi'u cadw. Rhowch gynnig arall arni ymhen ychydig funudau."
  },
  staleActionRejected: {
    title: 'Mae’r hysbysiad wedi cael ei ddiweddaru',
    body: 'Cafodd yr hysbysiad hwn ei ddiweddaru ers i chi ei agor. Adolygwch y manylion a rhowch gynnig arall arni.'
  },
  notificationActions: {
    copy: {
      text: 'Copïo fel un newydd',
      successTitle: "Hysbysiad wedi'i gopïo",
      successBody: 'Mae hysbysiad drafft newydd wedi cael ei greu.'
    },
    delete: {
      text: 'Dileu',
      successTitle: "Hysbysiad wedi'i ddileu",
      successBody: "Mae'r hysbysiad wedi cael ei ddileu."
    }
  },
  saveActions: {
    saveAndContinue: 'Cadw a pharhau',
    saveAndReturnToHub: "Cadw a dychwelyd i'r hyb",
    cancelAndReturnToHub: "Canslo a dychwelyd i'r hyb"
  },
  journeyStrip: {
    draft: 'Drafft',
    submitted: "Wedi'i gyflwyno",
    amend: 'Wrthi’n diwygio',
    deleted: "Wedi'i ddileu"
  }
}

export const validatorDefaults = {
  oneOf: 'Dewiswch opsiwn dilys',
  postcode: 'Rhowch god post dilys',
  vehicleReg: 'Rhowch rif cofrestru dilys',
  ukPhone: 'Rhowch rif ffôn dilys yn y DU',
  date: 'Rhowch ddyddiad dilys',
  wholeNumber: 'Rhowch rif cyfan',
  maxLength: (max) => `Rhowch ${max} nod neu lai`,
  numberBetween: (min, max) => `Rhowch rif rhwng ${min} a ${max}`
}
