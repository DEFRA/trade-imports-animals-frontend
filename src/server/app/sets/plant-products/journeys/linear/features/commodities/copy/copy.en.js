export const copy = {
  inputMethod: {
    title: 'How do you want to add your commodity details?',
    caption: 'Description of the goods',
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
    caption: 'Description of the goods',
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
  }
}
