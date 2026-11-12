import { withThousandsSeparators } from './thousands-separators.js'

const plural = (count, noun) => `${count} ${noun}${count === 1 ? '' : 's'}`

export const copy = {
  search: {
    title: 'What are you importing?',
    inset:
      'You must submit a separate notification for every single ITAHC. You must also submit a notification for goods that do not need an ITAHC.',
    searchLabel: 'Search for a commodity',
    searchHint:
      'You can search by common name (for example, cattle), commodity code (0102), or Latin name (Bos taurus).',
    searchButton: 'Search',
    noResults: 'No results found',
    selected: {
      heading: (count) => `${count} selected`,
      clearAll: 'Clear all',
      remove: 'Remove'
    },
    help: {
      summary: 'Help with commodity codes',
      reference:
        'Commodity codes are internationally recognised reference numbers.',
      describes:
        'A commodity code describes a specific product when importing or exporting goods.',
      lookupPrefix: 'You can look up commodity codes using the',
      lookupLink: 'Trade Tariff tool',
      lookupNewTab: '(opens in a new tab)',
      lookupHref: 'https://www.gov.uk/trade-tariff'
    },
    errors: {
      selectCommodity: 'Select a commodity'
    }
  },
  selectedCommodities: {
    caption: 'Selected commodities',
    commodityCode: 'Commodity code',
    species: 'Species',
    numberOfAnimals: 'Number of animals',
    actionsHidden: 'Actions'
  },
  consignmentDetails: {
    title: 'Commodity details',
    addAnother: 'Add another commodity',
    table: {
      remove: 'Remove'
    },
    animals: {
      label: 'Number of animals'
    },
    packages: {
      label: 'Number of packages (when required)',
      hint: 'Such as crates, bags or boxes'
    },
    errors: {
      animalsRequired: 'Enter the number of animals',
      animalsWholeNumber: 'Enter a whole number greater than 0',
      animalsAboveMax: (max) =>
        `Number of animals must be ${withThousandsSeparators(max)} or fewer`,
      packagesWholeNumber: 'Number of packages must be a whole number, like 5',
      packagesAboveMax: (max) =>
        `Number of packages must be ${withThousandsSeparators(max)} or fewer`,
      countDrop: (records, species, entered) =>
        `You have ${plural(records, 'identifier record')} for ${species} but entered ${plural(entered, 'animal')}. Remove identifier records or keep the higher count.`
    }
  },
  identification: {
    title: 'Identification details',
    inset:
      'You must add all animal identification details before the consignment arrives at the port of entry.',
    addAnotherCommodity: 'Add another commodity',
    changeAnimalCount: 'Change number of animals',
    summary: {
      change: 'Change'
    },
    identifierLabels: {
      animalIdentifierMicrochip: 'Microchip',
      animalIdentifierPassport: 'Passport',
      animalIdentifierTattoo: 'Tattoo',
      animalIdentifierEarTag: 'Ear tag',
      horseName: 'Horse name'
    },
    table: {
      animalColumn: 'Animal',
      actionsHidden: 'Actions'
    },
    counter: (species, next, cap) =>
      `Enter details for ${species} ${next} of ${cap}`,
    overCount: (cap, species, entered, overBy) =>
      `This commodity line lists ${cap} ${species} animals but you have entered details for ${entered}. Remove ${overBy} to continue.`,
    animalRow: (number) => `Animal ${number}`,
    animalRowNamed: (species, number) => `${species} ${number}`,
    removeRow: 'Remove',
    removeRowAria: (number) => `animal ${number}`,
    saveAndAddAnother: 'Save and add another',
    saveAndFinish: 'Save and finish',
    errors: {
      identifierMax: {
        animalIdentifierMicrochip: 'Microchip must be 58 characters or less',
        animalIdentifierPassport: 'Passport must be 58 characters or less',
        animalIdentifierTattoo: 'Tattoo must be 58 characters or less',
        animalIdentifierEarTag: 'Ear tag must be 58 characters or less',
        horseName: 'Horse name must be 58 characters or less'
      },
      atLeastOneIdentifier: 'Enter at least one identifier for this animal',
      capReached: (cap) =>
        `You have already entered details for all ${cap} animals — remove a record before adding another`
    }
  }
}
