// MACHINE-DRAFT Welsh — not reviewed by a translator. Do not ship user-facing without Welsh Language Standards sign-off.
export const copy = {
  title: 'Gwasanaethau symud nwyddau',
  caption: 'Cludiant',
  ctc: {
    legend:
      'A ydych yn defnyddio’r Confensiwn Cludo Cyffredin (CTC) i symud nwyddau, er enghraifft i safle rheoli?',
    hint: 'Os ydych, rhaid i chi ddarparu’r Cyfeirnod Symud (MRN) a fydd wedi cael ei gynhyrchu gan NCTS.',
    options: {
      ADD_MRN_NOW: 'Ydw – ychwanegu MRN nawr',
      ADD_MRN_LATER: 'Ydw – ychwanegu MRN yn ddiweddarach',
      NO: 'Nac ydw'
    }
  },
  mrn: {
    label: 'Cyfeirnod Symud (MRN)',
    hint: 'Mae’n cynnwys 18 nod, gan ddechrau â 2 rif, cod gwlad 2 lythyren ac yna 14 o lythrennau a rhifau. Er enghraifft, 24GB123456789AB012.'
  },
  ctcDetails: {
    summary: 'Beth yw’r CTC?',
    intro:
      'Mae’r Confensiwn Cludo Cyffredin (CTC) yn weithdrefn dollau sy’n eich galluogi i symud nwyddau’n gyflym rhwng gwledydd yn:',
    bullets: ['y DU', 'yr UE', 'gwledydd CTC eraill'],
    benefits:
      'Gall helpu i leihau nifer y datganiadau tollau y bydd angen i chi eu cwblhau ac ni fydd rhaid i chi dalu taliadau nes i chi ddod â’r symudiad i ben.',
    stepsIntro: 'I symud eich nwyddau gan ddefnyddio’r CTC, mae angen i chi:',
    steps: [
      'wirio a allwch ei ddefnyddio',
      'gael gwybod sut i’w ddefnyddio i symud nwyddau',
      'gynllunio eich llwybr cyn ei ddefnyddio'
    ],
    linkText:
      'Cael rhagor o wybodaeth am ddefnyddio cludo i symud nwyddau (yn agor mewn tab newydd)'
  },
  gvms: {
    legend:
      'A fydd y cludiant yn defnyddio’r Gwasanaeth Symud Cerbydau Nwyddau (GVMS)?',
    options: { yes: 'Bydd', no: 'Na fydd' }
  },
  gvmsDetails: {
    summary: 'Beth yw’r GVMS?',
    paragraphs: {
      intro:
        'Mae GVMS yn helpu i gyflymu cliriadau tollau mewn rhai porthladdoedd yn y DU.',
      stepsIntro: 'I symud eich nwyddau, mae angen i chi:',
      gmr: 'Mae’r GMR yn gyfeirnod unigol sy’n dwyn ynghyd nifer o ddatganiadau. Hebddo, ni allwch symud eich nwyddau drwy borthladdoedd y DU sy’n defnyddio GVMS ac efallai y byddwch yn wynebu oedi.',
      driver:
        'Rhaid i’r gyrrwr wirio GVMS i gael gwybod a oes angen archwiliad cyn iddo ddod oddi ar y cerbyd.'
    },
    links: {
      portsList:
        'Cael gwybod pa borthladdoedd sy’n defnyddio GVMS (yn agor mewn tab newydd)',
      register: 'Cofrestru ar gyfer GVMS (yn agor mewn tab newydd)',
      gmr: 'Cael cyfeirnod symud nwyddau (GMR) (yn agor mewn tab newydd)'
    }
  },
  errors: {
    commonTransitConventionRequired:
      'Dewiswch a ydych yn defnyddio’r Confensiwn Cludo Cyffredin (CTC)',
    movementReferenceNumberInvalid: 'Rhowch Gyfeirnod Symud dilys',
    usingGvmsRequired:
      'Dewiswch a ydych yn defnyddio’r Gwasanaeth Symud Cerbydau Nwyddau (GVMS)'
  }
}
