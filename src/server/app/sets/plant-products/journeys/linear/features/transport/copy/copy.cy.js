export const copy = {
  caption: 'Disgrifiad o’r nwyddau',
  heading: 'Cludiant i’r Safle Rheoli ar y Ffin (BCP)',
  bcp: {
    label: 'Safle rheoli ar y ffin mynediad',
    placeholder: 'Dewiswch y safle rheoli ar y ffin mynediad'
  },
  premises: {
    label: 'Mangre archwilio',
    placeholder: 'Dewiswch y fangre archwilio'
  },
  means: {
    heading: 'Dull cludo i’r BCP',
    label: 'Dull cludo i’r BCP',
    placeholder: 'Dewiswch y dull cludo i’r BCP'
  },
  identification: {
    label: 'Manylion adnabod y cludiant',
    hint: 'I adnabod y dull cludo, nodwch un o’r canlynol: rhif yr awyren, rhif y trên, rhif cofrestru’r cerbyd ffordd neu enw’r llong. Ar gyfer fferïau, nodwch rif cofrestru’r cerbyd ffordd hefyd.'
  },
  usesContainers: {
    legend:
      'A oes unrhyw drelars ffordd neu gynwysyddion cludo yn cael eu defnyddio i gludo’r llwyth?',
    hint: 'Rhowch fanylion yr holl drelars ffordd a chynwysyddion neu gall eich llwyth gael ei oedi. Efallai y bydd angen i chi gysylltu â’ch cludwr.',
    yes: 'Oes',
    no: 'Nac oes'
  },
  containers: {
    tableCaption: 'Cynwysyddion a threlars a ychwanegwyd',
    table: {
      containerNumber: 'Rhif y cynhwysydd neu’r trelar',
      sealNumber: 'Rhif y sêl',
      officialSeal: 'Sêl swyddogol',
      actions: 'Camau gweithredu'
    },
    containerNumber: {
      label: 'Rhif y cynhwysydd neu’r trelar',
      hint: 'Nodwch rif adnabod y cynhwysydd, neu rif cofrestru neu blât rhif y trelar.'
    },
    sealNumber: {
      label: 'Rhif y sêl',
      hint: 'Nodwch rif y sêl ar y dystysgrif swyddogol neu unrhyw sêl arall a grybwyllir yn y dogfennau ategol.'
    },
    officialSeal: {
      label: 'Sêl swyddogol yw hon',
      hint: 'Gosodir sêl swyddogol o dan oruchwyliaeth yr awdurdod cymwys sy’n rhoi’r dystysgrif.'
    },
    add: 'Ychwanegu cynhwysydd neu drelar arall',
    remove: 'Tynnu',
    notProvided: 'Heb ei ddarparu'
  },
  documentReference: {
    label: 'Cyfeirnod y ddogfen gludo',
    hint: 'Nodwch y cyfeirnod ar y bil ffordd awyr, bil llwytho, bil ffordd môr, nodyn cludo ffordd (CMR) neu ddogfen gludo arall.'
  },
  arrivalDate: {
    heading: 'Amcangyfrif o’r amser cyrraedd y BCP',
    legend: 'Amcangyfrif o’r dyddiad cyrraedd y BCP',
    hint: 'Er enghraifft, 27 3 2023',
    day: 'Diwrnod',
    month: 'Mis',
    year: 'Blwyddyn'
  },
  arrivalTime: {
    legend: 'Amcangyfrif o’r amser cyrraedd',
    hint: 'Nodwch yr amser gan ddefnyddio’r fformat 24 awr, er enghraifft, 14 50. Os nad ydych yn siŵr o’r union amser, peidiwch â defnyddio amseroedd ar yr awr, er enghraifft, 00 00. Ar gyfer llwybr nad yw’n GVMS, diweddarwch yr amser pan fyddwch yn gwybod yr amser cyrraedd.',
    hour: 'Awr',
    minute: 'Munudau'
  },
  errors: {
    bcpRequired: 'Dewiswch y safle rheoli ar y ffin mynediad',
    premisesRequired: 'Dewiswch y fangre archwilio',
    meansRequired: 'Dewiswch y dull cludo i’r BCP',
    identificationRequired: 'Nodwch fanylion adnabod y cludiant',
    identificationMaxLength:
      'Rhaid i fanylion adnabod y cludiant fod yn 50 o nodau neu lai',
    documentReferenceRequired: 'Nodwch gyfeirnod y ddogfen gludo',
    documentReferenceMaxLength:
      'Rhaid i gyfeirnod y ddogfen gludo fod yn 32 o nodau neu lai',
    arrivalDateRequired: 'Nodwch amcangyfrif o’r dyddiad cyrraedd y BCP',
    arrivalDateReal:
      'Rhaid i’r amcangyfrif o’r dyddiad cyrraedd fod yn ddyddiad go iawn',
    arrivalDateWindow:
      'Rhaid i’r amcangyfrif o’r dyddiad cyrraedd fod heddiw neu o fewn y 90 diwrnod nesaf',
    arrivalTimeRequired: 'Nodwch amcangyfrif o’r amser cyrraedd y BCP',
    arrivalTimeInvalid:
      'Nodwch amser gan ddefnyddio’r fformat 24 awr, er enghraifft 14 50',
    usesContainersRequired:
      'Dewiswch oes os defnyddir trelars ffordd neu gynwysyddion cludo',
    containerOrSealRequired: 'Nodwch rif cynhwysydd neu drelar, neu rif sêl',
    containerNumberMaxLength:
      'Rhaid i rif y cynhwysydd neu’r trelar fod yn 32 o nodau neu lai',
    sealNumberMaxLength: 'Rhaid i rif y sêl fod yn 100 o nodau neu lai'
  }
}
