const DESCRIPTION_OF_THE_GOODS = 'Description of the goods'
const COMMODITY_DETAILS = 'Commodity details'
const GENUS_AND_SPECIES = 'Genus (and Species)'

export const copy = {
  inputMethod: {
    title: 'How do you want to add your commodity details?',
    caption: DESCRIPTION_OF_THE_GOODS,
    heading: 'How do you want to add your commodity details?',
    options: {
      MANUAL: {
        label: 'Manual entry',
        hint: 'Enter one commodity line at a time.'
      },
      CSV: {
        label: 'Upload from a CSV file',
        hint: 'Add all details at once, by uploading a file you can prepare with most spreadsheet software. Recommended for consignments with many commodity lines.'
      }
    },
    errors: {
      required: 'Select how you want to add your commodity details'
    }
  },
  commoditySearch: {
    title: 'Commodity',
    caption: DESCRIPTION_OF_THE_GOODS,
    heading: 'Commodity',
    tabs: {
      codeSearch: 'Commodity code search',
      speciesSearch: 'Genus and species search'
    },
    codeSearch: {
      legend: 'Search commodities',
      label: 'Enter commodity code',
      hint: 'Enter the 8 or 10 digit commodity code',
      button: 'Search',
      noResults: 'No results'
    },
    tree: {
      heading: 'Find the commodity in the commodity tree',
      allCommodities: 'All commodities',
      select: 'Select'
    },
    speciesSearch: {
      legend: 'Search genus and species of commodity',
      label: 'Enter genus and species',
      hint: 'Use the full scientific name. This will be in Latin, for example, Prunus dulcis',
      button: 'Search',
      add: 'Add',
      noResults: 'No results'
    },
    errors: {
      codeRequired: 'Enter a commodity code',
      codeNumeric: 'Commodity code must be a number',
      codeDuplicate: 'You cannot add the same commodity code twice',
      speciesRequired: 'Enter a genus and species'
    }
  },
  basicDescription: {
    caption: DESCRIPTION_OF_THE_GOODS,
    heading: 'Commodity',
    commoditySummary: {
      caption: COMMODITY_DETAILS,
      codeHeader: 'Commodity code',
      descriptionHeader: 'Description'
    },
    legend: 'Select Genus (and Species) of commodity',
    hint: 'You can add multiple Genus (and Species)',
    added: {
      caption: 'Added Genus (and Species)',
      genusHeader: GENUS_AND_SPECIES,
      eppoHeader: 'EPPO code',
      removeLabel: 'Remove',
      removeHidden: 'from commodity'
    },
    filter: {
      legend: 'Filter',
      genusLabel: GENUS_AND_SPECIES,
      eppoLabel: 'EPPO code',
      searchLabel: 'Search',
      clearLabel: 'Clear'
    },
    results: {
      caption: 'Genus (and Species) search results',
      genusHeader: GENUS_AND_SPECIES,
      eppoHeader: 'EPPO code',
      addLabel: 'Add',
      addHidden: 'to commodity',
      noResults: 'No search results'
    },
    errors: {
      selectAtLeastOne: 'Select at least one Genus (and Species)'
    }
  },
  varietyOfGenusAndSpecies: {
    title: 'Variety and class of commodity',
    caption: DESCRIPTION_OF_THE_GOODS,
    heading: 'Variety and class of commodity',
    speciesHeading: '{eppoCode} - {genusAndSpecies}',
    repeatedControlContext:
      'for commodity line {line}, species {species}: {speciesHeading}',
    removeContext:
      '{variety}, {className} from commodity line {line}, species {species}: {speciesHeading}',
    varietyLabel: 'Variety',
    varietyPlaceholder: 'Select a variety',
    otherOption: 'Other',
    otherVarietyLabel: 'Other variety name',
    otherVarietyHint: 'Only if you chose Other',
    classLabel: 'Class',
    classPlaceholder: 'Select a class',
    classOptions: {
      CLASS_I: 'Class I',
      CLASS_II: 'Class II',
      EXTRA_CLASS: 'Extra Class'
    },
    table: {
      caption: 'Added varieties and classes',
      variety: 'Variety',
      class: 'Class',
      remove: 'Remove'
    },
    addAnotherVariety: 'Add another variety',
    addAnotherSpecies: 'Add another Genus (and species)',
    remove: 'Remove',
    errors: {
      varietyRequired: 'Select the variety',
      classRequired: 'Select the class',
      atLeastOneVariety: 'At least one species variety must be added',
      duplicatePair:
        'You have already added this variety and class for this species',
      otherVarietyRequired: 'Enter the name of the other variety',
      otherVarietyLength: 'Other variety name must be 32 characters or fewer'
    }
  },
  commoditySummary: {
    caption: DESCRIPTION_OF_THE_GOODS,
    heading: 'Commodity',
    tableCaption: 'Commodity summary table',
    columns: {
      commodityCode: 'Commodity code',
      genusAndSpecies: GENUS_AND_SPECIES,
      eppoCode: 'EPPO code',
      variety: 'Variety',
      class: 'Class',
      actions: 'Actions'
    },
    remove: 'Remove',
    removeContext:
      '{genusAndSpecies} from commodity line {line}, species {species}: {commodityCode}',
    addAnotherSpecies: 'Add another Genus (and Species)',
    addAnotherCommodity: 'Add another commodity',
    continue: 'Save and continue'
  },
  commodityBulkDetails: {
    title: COMMODITY_DETAILS,
    caption: DESCRIPTION_OF_THE_GOODS,
    heading: COMMODITY_DETAILS,
    controlContext: '{label} for {commodity}',
    optionContext: '{option} — {legend} for {commodity}',
    bulk: {
      heading: 'Apply to all commodity lines',
      selectLines: 'Select commodity lines',
      selectAll: 'Select all',
      apply: 'Apply',
      clear: 'Clear'
    },
    fields: {
      numberOfPackages: { label: 'Number of packages' },
      packageType: {
        label: 'Type of package',
        placeholder: 'Select the type of package'
      },
      quantity: { label: 'Quantity' },
      quantityType: {
        label: 'Quantity type',
        placeholder: 'Select the quantity type'
      },
      netWeight: { label: 'Net weight (kg)' },
      controlledAtmosphereContainer: {
        legend: 'Controlled atmosphere container',
        options: { yes: 'Yes', no: 'No' }
      },
      finishedOrPropagated: {
        legend: 'How will the commodity be used?',
        options: {
          finished: 'Finished product for final users',
          propagated: 'To be grown on or propagated'
        }
      },
      intendedForFinalUsers: {
        legend: 'Is the commodity intended for final users?',
        options: { yes: 'Yes', no: 'No' }
      },
      testAndTrial: { label: 'For test and trial' }
    },
    totals: {
      lineHeading: 'Commodity line totals',
      consignmentHeading: 'Consignment totals',
      packages: 'Total packages',
      netWeight: 'Total net weight (kg)'
    },
    errors: {
      selectLine: 'Select at least one commodity line to apply changes to',
      fillOneField:
        'Fill in at least one field to update the selected commodity lines',
      numberOfPackagesRequired: 'Enter the number of packages',
      numberOfPackagesWhole: 'Number of packages must be a whole number',
      packageTypeRequired: 'Select the type of package',
      quantityRequired: 'Enter the quantity',
      quantityFormat:
        'Quantities cannot have more than 3 decimals, or be larger than 16 digits including decimals',
      quantityTypeRequired: 'Select the quantity type',
      netWeightRequired: 'Enter the net weight in kilograms',
      netWeightMin: 'Net weight must be 0.001 or more',
      netWeightDecimals: 'Net weight cannot have more than 3 decimals',
      netWeightDigits:
        'Net weight cannot have more than 16 digits, including decimals',
      finishedOrPropagatedRequired:
        'Select whether the commodity is intended for final users or propagating'
    }
  }
}
