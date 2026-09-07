// MACHINE-DRAFT Welsh — not reviewed by a translator. Do not ship user-facing without Welsh Language Standards sign-off.
export const copy = {
  title: 'Prif reswm dros fewnforio',
  legend: 'Beth yw prif reswm mewnforio’r anifeiliaid?',
  reasonHints: {
    internalMarket:
      'Ar gyfer mewnforio anifeiliaid y bwriedir eu gwerthu neu eu defnyddio ym Mhrydain Fawr (Cymru, Lloegr neu’r Alban).',
    transhipmentOrOnwardTravel:
      'Ar gyfer anifeiliaid y bwriedir iddynt deithio’n uniongyrchol i drydedd wlad, a fydd yn aros o fewn yr un porthladd neu faes awyr ym Mhrydain Fawr yn unig wrth symud i gyfrwng cludo arall.',
    transit:
      'Ar gyfer anifeiliaid sy’n symud drwy Brydain Fawr er mwyn teithio’n uniongyrchol i drydedd wlad, a fydd yn dod i mewn i Brydain Fawr mewn un porthladd neu faes awyr ac yn gadael o un gwahanol yng Nghymru, Lloegr neu’r Alban.',
    reEntry:
      'Ar gyfer anifeiliaid a awdurdodwyd i ail-fynediad, neu allforion a wrthodwyd sy’n dychwelyd i Brydain Fawr.',
    temporaryAdmissionHorses:
      'Ar gyfer ceffylau a awdurdodwyd i fynediad dros dro.'
  },
  purpose: {
    legend: 'Diben yn y farchnad fewnol',
    hints: {
      'transfer-of-ownership-sale-gift':
        'Unrhyw symudiad anifail sydd â’r nod o werthu’r anifail neu drosglwyddo perchnogaeth yr anifail o un person neu endid i’r llall. Er enghraifft, anifeiliaid sydd wedi’u gwerthu ac sy’n cael eu symud at berchennog newydd neu a fydd yn cael eu gwerthu ar ôl cyrraedd Prydain Fawr, pryniannau gan fridiwr/siop dramor a lle mae anifail yn cael ei symud at berchennog newydd heb unrhyw werthiant (e.e. rhodd)',
      'transfer-of-ownership-rescue':
        'Mae perchnogaeth anifail/anifeiliaid yn newid o un person neu endid i’r llall drwy ailgartrefu ac mae’n cael ei fabwysiadu/faethu gan deuluoedd newydd, gyda neu heb gyfnewid neu roi arian.',
      breeding:
        'Anifeiliaid ar gyfer atgenhedlu. Mae hyn yn cynnwys anifeiliaid y bwriedir iddynt gyfrannu at gronfa enynnol rhaglen fridio, gwella ansawdd da byw, neu gynhyrchu epil',
      research: 'Anifeiliaid i’w defnyddio mewn ymchwil wyddonol neu feddygol.',
      'racing-competition-show-or-training':
        'Anifeiliaid i gymryd rhan mewn digwyddiadau cystadleuol neu hyfforddi',
      'approved-premises-or-body':
        'Anifeiliaid ar gyfer arddangosfeydd, sŵau, casgliadau, neu raglenni cadwraeth lle mae angen trwydded neu gymeradwyaeth.',
      'companion-animal-not-for-resale-or-rehoming':
        'Anifeiliaid mewn perchnogaeth breifat sy’n cael eu mewnforio o dan y rheolau masnachol gan nad yw’r anifail yn gallu bodloni’r gofynion anfasnachol, er enghraifft, un neu fwy o anifeiliaid yn cael eu cludo gan gludwr masnachol heb eu perchennog neu berson awdurdodedig, perchennog nad yw’n teithio o fewn pum niwrnod i symudiad yr anifeiliaid neu grŵp o bump neu fwy o anifeiliaid yng nghwmni eu perchennog.',
      production:
        'Anifeiliaid sy’n cael eu ffermio i gynhyrchu cig, llaeth, wyau, gwlân neu unrhyw gynnyrch neu is-gynnyrch anifail arall',
      slaughter:
        'Anifeiliaid i’w lladd a’u prosesu ar gyfer cynhyrchu cig yn fuan ar ôl cyrraedd Prydain Fawr.',
      fattening: 'Anifeiliaid i’w pesgi ar gyfer cynhyrchu cig.',
      restocking:
        'I ailgyflenwi neu wella poblogaethau rhywogaethau, er enghraifft, ailstocio anifeiliaid hela neu bysgod.'
    }
  },
  country: {
    label: 'Gwlad gyrchfan',
    placeholder: 'Dewiswch wlad'
  },
  port: {
    label: 'Porthladd ymadael',
    placeholder: 'Dewiswch borthladd ymadael'
  },
  date: {
    label: 'Dyddiad ymadael',
    hint: 'Er enghraifft, 27/3/2026'
  },
  errors: {
    purposeRequired: 'Dewiswch ddiben yn y farchnad fewnol',
    countryRequired: 'Dewiswch y wlad gyrchfan',
    portRequired: 'Dewiswch y porthladd ymadael',
    dateRequired: 'Rhowch ddyddiad ymadael',
    dateInvalid: 'Rhowch ddyddiad ymadael go iawn'
  }
}
