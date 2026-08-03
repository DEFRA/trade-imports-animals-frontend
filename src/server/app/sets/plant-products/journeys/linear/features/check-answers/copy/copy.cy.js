// MACHINE-DRAFT Welsh — not reviewed by a translator. Do not ship user-facing without Welsh Language Standards sign-off.
export const copy = {
  title: 'Adolygu eich hysbysiad',
  continue: 'Parhau',
  change: 'Newid',
  missingAnswer: 'Ychwanegu ateb sydd ar goll',
  missingAnswerContext: (label) => `ar gyfer ${label.toLowerCase()}`,
  yesNo: { yes: 'Iawn', no: 'Na' },
  importTypes: {
    plants: 'Planhigion, cynhyrchion planhigion a gwrthrychau eraill'
  },
  ctcOptions: {
    ADD_MRN_NOW: 'Ydw – ychwanegu MRN nawr',
    ADD_MRN_LATER: 'Ydw – ychwanegu MRN yn ddiweddarach',
    NO: 'Nac ydw'
  },
  finishedOrPropagated: {
    FINISHED: 'Gorffenedig',
    PROPAGATED: 'Wedi’i luosogi'
  },
  cards: {
    aboutConsignment: {
      heading: 'Ynglŷn â’r llwyth',
      rows: {
        importType: 'Beth ydych chi’n ei fewnforio?',
        internalReference: 'Cyfeirnod mewnol',
        countryOfOrigin: 'Gwlad tarddiad',
        countryOfConsignment: 'Y wlad y daeth y llwyth ohoni',
        reasonForImport: 'Diben y llwyth'
      }
    },
    commodities: {
      heading: 'Disgrifiad o’r nwyddau',
      tables: {
        commodities: 'Nwyddau',
        species: 'Rhywogaethau',
        varieties: 'Amrywogaethau',
        measures: 'Manylion y nwydd'
      },
      columns: {
        line: 'Nwydd',
        code: 'Cod nwydd',
        description: 'Disgrifiad',
        genusAndSpecies: 'Genws a rhywogaeth',
        variety: 'Amrywogaeth',
        varietyClass: 'Dosbarth',
        packages: 'Pecynnau',
        packageType: 'Math o becyn',
        quantity: 'Swm',
        quantityType: 'Math o swm',
        netWeight: 'Pwysau net',
        controlledAtmosphere: 'Cynhwysydd awyrgylch rheoledig',
        finishedOrPropagated: 'Gorffenedig neu wedi’i luosogi',
        intendedForFinalUsers: 'Wedi’i fwriadu ar gyfer defnyddwyr terfynol',
        testAndTrial: 'Profi a threialu',
        action: 'Cam gweithredu'
      },
      commodity: (number) => `Nwydd ${number}`,
      species: (number) => `Rhywogaeth ${number}`,
      changeCommodity: (number) => `nwydd ${number}`,
      intendedForFinalUsersContext: (label, commodity) =>
        `${label.toLowerCase()} ar gyfer ${commodity.toLowerCase()}`
    },
    additionalDetails: {
      heading: 'Manylion ychwanegol',
      rows: {
        totalGrossWeight: 'Cyfanswm y pwysau gros',
        grossVolume: 'Cyfaint gros',
        grossVolumeUnit: 'Uned cyfaint gros',
        totalNetWeight: 'Cyfanswm y pwysau net',
        totalPackages: 'Cyfanswm y pecynnau'
      }
    },
    transport: {
      heading: 'Cludiant i’r Safle Rheoli ar y Ffin',
      rows: {
        borderControlPost: 'Safle Rheoli ar y Ffin',
        inspectionPremises: 'Mangre archwilio',
        meansOfTransport: 'Dull cludo',
        transportIdentification: 'Manylion adnabod y cludiant',
        transportDocumentReference: 'Cyfeirnod y ddogfen gludo',
        arrivalDate: 'Amcangyfrif o’r dyddiad cyrraedd',
        arrivalTime: 'Amcangyfrif o’r amser cyrraedd',
        usesContainers: 'Yn defnyddio cynwysyddion?',
        containerNumber: (number) => `Rhif cynhwysydd ${number}`,
        sealNumber: (number) => `Rhif sêl cynhwysydd ${number}`,
        officialSeal: (number) => `Sêl swyddogol cynhwysydd ${number}`
      }
    },
    goodsMovement: {
      heading: 'Gwasanaethau symud nwyddau',
      rows: {
        commonTransitConvention:
          'Yn defnyddio’r Confensiwn Cludo Cyffredin (CTC)',
        movementReferenceNumber: 'Cyfeirnod Symud (MRN)',
        usingGvms: 'Yn defnyddio’r Gwasanaeth Symud Cerbydau Nwyddau (GVMS)'
      }
    },
    contact: {
      heading: 'Manylion cyswllt',
      rows: {
        name: 'Enw',
        email: 'Cyfeiriad e-bost',
        telephone: 'Rhif ffôn symudol'
      }
    },
    nominatedContacts: {
      heading: 'Cysylltiadau enwebedig',
      empty: 'Dim cysylltiadau enwebedig wedi’u hychwanegu',
      columns: {
        name: 'Enw',
        email: 'Cyfeiriad e-bost',
        telephone: 'Rhif ffôn symudol',
        agent: 'Asiant'
      },
      change: 'cysylltiadau enwebedig'
    },
    documents: {
      heading: 'Dogfennau cysylltiedig',
      columns: {
        type: 'Math o ddogfen',
        reference: 'Cyfeirnod y ddogfen',
        issueDate: 'Dyddiad cyhoeddi'
      },
      change: 'dogfennau cysylltiedig'
    },
    traders: {
      heading: 'Masnachwyr',
      sameAsConsignee: 'Yr un fath â chyfeiriad y mewnforiwr',
      rows: {
        importer: 'Mewnforiwr',
        deliveryAddress: 'Cyfeiriad danfon',
        destinationName: 'Enw’r cyfeiriad danfon',
        destinationAddressLine1: 'Llinell 1 y cyfeiriad danfon',
        destinationAddressLine2: 'Llinell 2 y cyfeiriad danfon',
        destinationAddressLine3: 'Llinell 3 y cyfeiriad danfon',
        destinationCity: 'Tref neu ddinas danfon',
        destinationPostcode: 'Cod post neu god ZIP danfon',
        destinationCountry: 'Gwlad danfon',
        consignorName: 'Enw’r traddodwr neu’r allforiwr',
        consignorAddressLine1: 'Llinell gyfeiriad 1 y traddodwr',
        consignorAddressLine2: 'Llinell gyfeiriad 2 y traddodwr',
        consignorAddressLine3: 'Llinell gyfeiriad 3 y traddodwr',
        consignorCity: 'Tref neu ddinas y traddodwr',
        consignorPostcode: 'Cod post neu god ZIP y traddodwr',
        consignorTelephone: 'Rhif ffôn y traddodwr',
        consignorCountry: 'Gwlad y traddodwr',
        consignorEmail: 'Cyfeiriad e-bost y traddodwr',
        packerName: 'Enw’r paciwr',
        packerAddressLine1: 'Llinell gyfeiriad 1 y paciwr',
        packerAddressLine2: 'Llinell gyfeiriad 2 y paciwr',
        packerAddressLine3: 'Llinell gyfeiriad 3 y paciwr',
        packerCity: 'Tref neu ddinas y paciwr',
        packerPostcode: 'Cod post neu god ZIP y paciwr',
        packerCountry: 'Gwlad y paciwr'
      }
    }
  }
}
