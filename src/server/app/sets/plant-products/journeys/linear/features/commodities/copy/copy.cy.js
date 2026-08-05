// MACHINE-DRAFT Welsh — not reviewed by a translator. Do not ship user-facing without Welsh Language Standards sign-off.
const DESCRIPTION_OF_THE_GOODS = 'Disgrifiad o’r nwyddau'
const COMMODITY_DETAILS = 'Manylion y nwydd'
const GENUS_AND_SPECIES = 'Genws (a Rhywogaeth)'

export const copy = {
  inputMethod: {
    title: 'Sut ydych chi am ychwanegu manylion eich nwydd?',
    caption: DESCRIPTION_OF_THE_GOODS,
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
    caption: DESCRIPTION_OF_THE_GOODS,
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
  },
  basicDescription: {
    caption: DESCRIPTION_OF_THE_GOODS,
    heading: 'Nwydd',
    commoditySummary: {
      caption: COMMODITY_DETAILS,
      codeHeader: 'Cod nwydd',
      descriptionHeader: 'Disgrifiad'
    },
    legend: 'Dewiswch Genws (a Rhywogaeth) y nwydd',
    hint: 'Gallwch ychwanegu sawl Genws (a Rhywogaeth)',
    added: {
      caption: 'Genws (a Rhywogaeth) a ychwanegwyd',
      genusHeader: GENUS_AND_SPECIES,
      eppoHeader: 'Cod EPPO',
      removeLabel: 'Tynnu',
      removeHidden: 'o nwydd'
    },
    filter: {
      legend: 'Hidlo',
      genusLabel: GENUS_AND_SPECIES,
      eppoLabel: 'Cod EPPO',
      searchLabel: 'Chwilio',
      clearLabel: 'Clirio'
    },
    results: {
      caption: 'Canlyniadau chwilio Genws (a Rhywogaeth)',
      genusHeader: GENUS_AND_SPECIES,
      eppoHeader: 'Cod EPPO',
      addLabel: 'Ychwanegu',
      addHidden: 'at nwydd',
      noResults: 'Dim canlyniadau chwilio'
    },
    errors: {
      selectAtLeastOne: 'Dewiswch o leiaf un Genws (a Rhywogaeth)'
    }
  },
  varietyOfGenusAndSpecies: {
    title: 'Amrywogaeth a dosbarth y nwydd',
    caption: DESCRIPTION_OF_THE_GOODS,
    heading: 'Amrywogaeth a dosbarth y nwydd',
    speciesHeading: '{eppoCode} – {genusAndSpecies}',
    repeatedControlContext:
      'ar gyfer llinell nwydd {line}, rhywogaeth {species}: {speciesHeading}',
    removeContext:
      '{variety}, {className} o linell nwydd {line}, rhywogaeth {species}: {speciesHeading}',
    varietyLabel: 'Amrywogaeth',
    varietyPlaceholder: 'Dewiswch amrywogaeth',
    otherOption: 'Arall',
    otherVarietyLabel: 'Enw amrywogaeth arall',
    otherVarietyHint: 'Dim ond os dewisoch Arall',
    classLabel: 'Dosbarth',
    classPlaceholder: 'Dewiswch ddosbarth',
    classOptions: {
      CLASS_I: 'Dosbarth I',
      CLASS_II: 'Dosbarth II',
      EXTRA_CLASS: 'Dosbarth Ychwanegol'
    },
    table: {
      caption: 'Amrywogaethau a dosbarthiadau a ychwanegwyd',
      variety: 'Amrywogaeth',
      class: 'Dosbarth',
      remove: 'Tynnu'
    },
    addAnotherVariety: 'Ychwanegu amrywogaeth arall',
    addAnotherSpecies: 'Ychwanegu Genws (a rhywogaeth) arall',
    remove: 'Tynnu',
    errors: {
      varietyRequired: 'Dewiswch yr amrywogaeth',
      classRequired: 'Dewiswch y dosbarth',
      atLeastOneVariety: 'Rhaid ychwanegu o leiaf un amrywogaeth rhywogaeth',
      duplicatePair:
        'Rydych eisoes wedi ychwanegu’r amrywogaeth a’r dosbarth hwn ar gyfer y rhywogaeth hon',
      otherVarietyRequired: 'Rhowch enw’r amrywogaeth arall',
      otherVarietyLength:
        'Rhaid i enw’r amrywogaeth arall fod yn 32 nod neu lai'
    }
  },
  commoditySummary: {
    caption: DESCRIPTION_OF_THE_GOODS,
    heading: 'Nwydd',
    tableCaption: 'Tabl crynodeb nwyddau',
    columns: {
      commodityCode: 'Cod nwydd',
      genusAndSpecies: GENUS_AND_SPECIES,
      eppoCode: 'Cod EPPO',
      variety: 'Amrywogaeth',
      class: 'Dosbarth',
      actions: 'Camau gweithredu'
    },
    remove: 'Tynnu',
    removeContext:
      '{genusAndSpecies} o linell nwydd {line}, rhywogaeth {species}: {commodityCode}',
    addAnotherSpecies: 'Ychwanegu Genws (a Rhywogaeth) arall',
    addAnotherCommodity: 'Ychwanegu nwydd arall',
    continue: 'Cadw a pharhau'
  },
  commodityBulkDetails: {
    title: COMMODITY_DETAILS,
    caption: DESCRIPTION_OF_THE_GOODS,
    heading: COMMODITY_DETAILS,
    controlContext: '{label} ar gyfer {commodity}',
    optionContext: '{option} — {legend} ar gyfer {commodity}',
    bulk: {
      heading: 'Cymhwyso i bob llinell nwydd',
      selectLines: 'Dewiswch linellau nwyddau',
      selectAll: 'Dewis pob un',
      apply: 'Cymhwyso',
      clear: 'Clirio'
    },
    fields: {
      numberOfPackages: { label: 'Nifer y pecynnau' },
      packageType: {
        label: 'Math o becyn',
        placeholder: 'Dewiswch y math o becyn'
      },
      quantity: { label: 'Swm' },
      quantityType: {
        label: 'Math o swm',
        placeholder: 'Dewiswch y math o swm'
      },
      netWeight: { label: 'Pwysau net (kg)' },
      controlledAtmosphereContainer: {
        legend: 'Cynhwysydd awyrgylch rheoledig',
        options: { yes: 'Iawn', no: 'Na' }
      },
      finishedOrPropagated: {
        legend: 'Sut bydd y nwydd yn cael ei ddefnyddio?',
        options: {
          finished: 'Cynnyrch gorffenedig ar gyfer defnyddwyr terfynol',
          propagated: 'I’w dyfu ymlaen neu ei luosogi'
        }
      },
      intendedForFinalUsers: {
        legend: 'A yw’r nwydd ar gyfer defnyddwyr terfynol?',
        options: { yes: 'Iawn', no: 'Na' }
      },
      testAndTrial: { label: 'Ar gyfer profi a threialu' }
    },
    totals: {
      lineHeading: 'Cyfansymiau llinell nwydd',
      consignmentHeading: 'Cyfansymiau’r llwyth',
      packages: 'Cyfanswm y pecynnau',
      netWeight: 'Cyfanswm y pwysau net (kg)'
    },
    errors: {
      selectLine:
        'Dewiswch o leiaf un llinell nwydd i gymhwyso newidiadau iddi',
      fillOneField:
        'Llenwch o leiaf un maes i ddiweddaru’r llinellau nwyddau a ddewiswyd',
      numberOfPackagesRequired: 'Rhowch nifer y pecynnau',
      numberOfPackagesWhole: 'Rhaid i nifer y pecynnau fod yn rhif cyfan',
      packageTypeRequired: 'Dewiswch y math o becyn',
      quantityRequired: 'Rhowch y swm',
      quantityFormat:
        'Ni all symiau fod â mwy na 3 lle degol, na bod yn fwy nag 16 digid gan gynnwys degolion',
      quantityTypeRequired: 'Dewiswch y math o swm',
      netWeightRequired: 'Rhowch y pwysau net mewn cilogramau',
      netWeightMin: 'Rhaid i’r pwysau net fod yn 0.001 neu fwy',
      netWeightDecimals: 'Ni all y pwysau net fod â mwy na 3 lle degol',
      netWeightDigits:
        'Ni all y pwysau net fod â mwy nag 16 digid, gan gynnwys degolion',
      finishedOrPropagatedRequired:
        'Dewiswch a yw’r nwydd ar gyfer defnyddwyr terfynol neu luosogi'
    }
  }
}
