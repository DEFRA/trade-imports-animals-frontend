const plural = (count, noun) => `${count} ${noun}${count === 1 ? '' : 's'}`

export const copy = {
  search: {
    title: 'What are you importing?',
    inset: 'Each health certificate requires a separate notification.',
    search: {
      label: 'Search for a common name, commodity code or scientific name',
      hint: 'For example, Cow, 0102, or Bos taurus',
      button: 'Search'
    },
    noMatches: 'No commodities match your search.',
    typeFilter: {
      label: 'Type of commodity',
      hint: 'Filter the species by type',
      all: 'All types',
      button: 'Filter species'
    },
    selectedCount: (count) => `${count} selected`,
    remove: 'Remove',
    removeAria: (text) => `Remove ${text}`,
    help: {
      summary: 'Help with commodity codes',
      text: 'Commodity codes are used to classify goods for import and export.'
    },
    errors: {
      selectCommodity: 'Select a commodity'
    }
  },
  consignmentDetails: {
    title: 'Consignment details',
    emptyText: 'You have not added any commodities yet.',
    addAnother: 'Add another commodity',
    addFirst: 'Add a commodity',
    table: {
      caption: 'Selected commodities',
      commodityCode: 'Commodity code',
      commonName: 'Common name',
      actionsHidden: 'Actions',
      remove: 'Remove'
    },
    animals: {
      label: 'Number of animals',
      hint: 'For example, 1, 25 or 5000.'
    },
    packages: {
      label: 'Number of packages (optional)',
      hint: 'Such as crates, bags or boxes'
    },
    errors: {
      animalsWholeNumber: 'Number of animals must be a whole number, like 25',
      packagesWholeNumber: 'Number of packages must be a whole number, like 5',
      countDrop: (records, species, entered) =>
        `You have ${plural(records, 'identifier record')} for ${species} but entered ${plural(entered, 'animal')}. Remove identifier records or keep the higher count.`
    }
  },
  identification: {
    title: 'Animal identification details',
    inset:
      'You must add all animal identification details before the consignment arrives at the port of entry.',
    emptyText: 'You have not added any commodities yet.',
    addCommodity: 'Add a commodity',
    identifierLabels: {
      animalIdentifierPassport: 'Passport',
      animalIdentifierTattoo: 'Tattoo',
      animalIdentifierEarTag: 'Ear tag',
      horseName: 'Horse name',
      animalIdentifierIdentificationDetails: 'Identification details',
      animalIdentifierDescription: 'Description'
    },
    permanentAddressSummaryLabel: 'Permanent address',
    noIdentifier: 'No identifier provided',
    typeFields: {
      animalIdentifierPassport: {
        label: 'Passport number',
        hint: 'For example, UK123456789'
      },
      animalIdentifierTattoo: {
        label: 'Tattoo',
        hint: 'For example, AB1234'
      },
      animalIdentifierEarTag: {
        label: 'Ear tag number',
        hint: 'For example, UK123456789012'
      },
      horseName: { label: 'Horse name' }
    },
    fallbackFields: {
      animalIdentifierIdentificationDetails: {
        label: 'Identification details',
        hint: 'Any other way this animal is identified, if it has no passport, tattoo or ear tag'
      },
      animalIdentifierDescription: { label: 'Animal description' }
    },
    counterNoCap: (species) => `Enter details for ${species}`,
    counter: (species, next, cap) =>
      `Enter details for ${species} ${next} of ${cap}`,
    overCount: (cap, species, entered, overBy) =>
      `This commodity line lists ${cap} ${species} animals but you have entered details for ${entered}. Remove ${overBy} to continue.`,
    allEntered: (cap, species) =>
      `You have entered details for all ${cap} ${species} animals. Remove a record if you need to replace it.`,
    animalRow: (number) => `Animal ${number}`,
    removeRow: 'Remove',
    removeRowAria: (number) => `animal ${number}`,
    permanentAddress: {
      heading: 'Permanent address',
      required: 'A permanent address is required for this animal.'
    },
    saveAndAddAnother: 'Save and add another',
    saveAndFinish: 'Save and finish',
    address: {
      nameOrOrganisationName: 'Name or organisation name',
      addressLine1: 'Address line 1',
      addressLine2: 'Address line 2 (optional)',
      townOrCity: 'Town or city',
      county: 'County (optional)',
      postalOrZipCode: 'Postal or zip code',
      country: 'Country',
      countryPlaceholder: 'Select a country',
      telephoneNumber: 'Telephone number',
      emailAddress: 'Email address'
    },
    errors: {
      identifierMax: {
        animalIdentifierPassport: 'Passport must be 58 characters or fewer',
        animalIdentifierTattoo: 'Tattoo must be 58 characters or fewer',
        animalIdentifierEarTag: 'Ear tag must be 58 characters or fewer',
        horseName: 'Horse name must be 58 characters or fewer',
        animalIdentifierIdentificationDetails:
          'Identification details must be 58 characters or fewer',
        animalIdentifierDescription:
          'Description must be 58 characters or fewer'
      },
      addressMandatory: {
        nameOrOrganisationName: 'Enter a name or organisation name',
        addressLine1: 'Enter address line 1',
        townOrCity: 'Enter a town or city',
        postalOrZipCode: 'Enter a postal or zip code',
        country: 'Select a country',
        telephoneNumber: 'Enter a telephone number',
        emailAddress: 'Enter an email address'
      },
      addressFormat: {
        nameOrOrganisationName:
          'Name or organisation name must be 255 characters or less',
        addressLine1: 'Address line 1 must be 255 characters or less',
        addressLine2: 'Address line 2 must be 255 characters or less',
        townOrCity: 'Town or city must be 100 characters or less',
        county: 'County must be 100 characters or less',
        postalOrZipCode: 'Postal or zip code must be 12 characters or less',
        country: 'Select a country from the list',
        telephoneNumber: 'Telephone number must be 20 characters or less',
        emailAddress: 'Email address must be 254 characters or less'
      },
      atLeastOneIdentifier: 'Enter at least one identifier for this animal',
      capReached: (cap) =>
        `You have already entered details for all ${cap} animals — remove a record before adding another`
    }
  }
}
