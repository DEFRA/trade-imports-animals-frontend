// MACHINE-DRAFT Welsh — not reviewed by a translator. Do not ship user-facing without Welsh Language Standards sign-off.
export const copy = {
  inputMethod: {
    title: 'Sut ydych chi am ychwanegu manylion eich nwydd?',
    caption: 'Disgrifiad o’r nwyddau',
    heading: 'Sut ydych chi am ychwanegu manylion eich nwydd?',
    options: {
      MANUAL: {
        label: 'Cofnodi â llaw',
        hint: 'Rhowch un llinell nwydd ar y tro.'
      },
      CSV: {
        label: 'Uwchlwytho o ffeil CSV',
        hint: 'Ychwanegwch yr holl fanylion ar unwaith drwy uwchlwytho ffeil y gallwch ei pharatoi gyda’r rhan fwyaf o feddalwedd taenlenni. Argymhellir ar gyfer llwythi sydd â llawer o linellau nwyddau.'
      }
    },
    errors: {
      required: 'Dewiswch sut rydych chi am ychwanegu manylion eich nwydd'
    }
  },
  commoditySearch: {
    title: 'Nwydd',
    caption: 'Disgrifiad o’r nwyddau',
    heading: 'Nwydd',
    tabs: {
      codeSearch: 'Chwilio yn ôl cod nwydd',
      speciesSearch: 'Chwilio yn ôl genws a rhywogaeth'
    },
    codeSearch: {
      legend: 'Chwilio am nwyddau',
      label: 'Rhowch god nwydd',
      hint: 'Rhowch y cod nwydd 8 neu 10 digid',
      button: 'Chwilio',
      noResults: 'Dim canlyniadau'
    },
    tree: {
      heading: 'Dewch o hyd i’r nwydd yn y goeden nwyddau',
      allCommodities: 'Pob nwydd',
      select: 'Dewis'
    },
    speciesSearch: {
      legend: 'Chwilio am genws a rhywogaeth y nwydd',
      label: 'Rhowch genws a rhywogaeth',
      hint: 'Defnyddiwch yr enw gwyddonol llawn. Bydd hwn yn Lladin, er enghraifft, Prunus dulcis',
      button: 'Chwilio',
      add: 'Ychwanegu',
      noResults: 'Dim canlyniadau'
    },
    errors: {
      codeRequired: 'Rhowch god nwydd',
      codeNumeric: 'Rhaid i’r cod nwydd fod yn rhif',
      codeDuplicate: 'Ni allwch ychwanegu’r un cod nwydd ddwywaith',
      speciesRequired: 'Rhowch genws a rhywogaeth'
    }
  }
}
