export const copy = {
  portOfEntry: {
    title: 'Arrival details',
    arrivalDate: {
      label: 'Arrival date at port of entry',
      hint: 'The expected date of arrival at the port of entry. For example, 27/3/2026'
    },
    port: {
      label: 'Port of entry',
      hint: 'Select where the transporter will enter with the consignment. Start typing to search by port or airport name or code.',
      placeholder: 'Select a port',
      noResults: 'No ports found'
    },
    means: {
      label: 'Means of transport to the port of entry',
      placeholder: 'Select one',
      options: {
        AIRPLANE: 'Air',
        RAILWAY: 'Rail',
        ROAD_VEHICLE: 'Road',
        VESSEL: 'Sea'
      }
    },
    identification: {
      label: 'Transport identification',
      hint: {
        lead: 'Enter one of the following:',
        items: [
          'flight number',
          'train number',
          'road vehicle registration number',
          'vessel name (for ferries, also the road vehicle registration number)'
        ]
      }
    },
    documentReference: {
      label: 'Transport document reference',
      hint: 'Enter the reference number on the air waybill, bill of lading, sea waybill, road consignment note (CMR) or other transport document.'
    },
    errors: {
      arrivalDateInvalid: 'Enter a real arrival date',
      arrivalDateOutOfRange: (earliest, latest) =>
        `Arrival date at port of entry must be between ${earliest} and ${latest}`,
      portNoLongerAvailable:
        'The saved port of entry is no longer available. Select a port from the list.',
      arrivalDateNoLongerInWindow:
        'The saved arrival date is no longer a date you can choose. Enter a new arrival date.',
      identificationMaxLength:
        'Transport identification must be 58 characters or less',
      documentReferenceMaxLength:
        'Transport document reference must be 58 characters or less'
    }
  },
  transitCountries: {
    title: 'Which countries will the consignment travel through?',
    betweenCountries:
      'Countries the consignment will travel through are countries between the country of origin and the destination country.',
    excludesUk: 'This does not include the United Kingdom.',
    country: {
      label: 'Enter a country',
      hint: 'Enter each country that the consignment will travel through',
      placeholder: 'Search for a country',
      noResults: 'No countries found'
    },
    add: 'Add country',
    table: {
      caption: 'Countries you have added',
      country: 'Country',
      actionsHidden: 'Actions'
    },
    remove: 'Remove',
    removeHidden: (country) => country,
    empty: 'You have not added any countries yet.',
    added: (country) => `${country} added.`,
    removed: (country) => `${country} removed.`,
    limitReached: (max) =>
      `Maximum of ${max} countries reached. Remove a country to add another.`,
    errors: {
      fromList: 'Select countries from the list',
      maxCountries: (max) => `Select up to ${max} countries`,
      chooseCountry: 'Enter a country to add',
      alreadyAdded: (country) => `You have already added ${country}`,
      someNoLongerAvailable:
        'Some of your saved transit countries are no longer available. Review the list before you continue.'
    }
  },
  transporters: {
    title: 'Transporter details',
    intro:
      'This is the person or company responsible for transporting the consignment.',
    legend: 'Select a transporter',
    guidance: {
      authorisationLead:
        'Your transporter must hold a valid transporter authorisation, issued by DAERA or APHA in the UK if they are:',
      authorisationConditions: [
        'transporting any live vertebrate animals in, to, from or through Great Britain (GB)',
        'travelling on journeys of over 65 km',
        'transporting as part of an economic (commercial) activity'
      ],
      linkText:
        'Find out how to transport animals in connection with an economic activity (opens in a new tab)',
      linkHref:
        'https://www.gov.uk/guidance/animal-welfare-in-transport#transporting-animals-in-connection-with-an-economic-activity',
      daeraValid: 'Documents issued by DAERA are valid for use in GB.',
      euNotValid:
        'Documents issued in any EU member state are not valid for use in GB.'
    },
    types: {
      Commercial: 'Commercial',
      Private: 'Private'
    },
    statuses: {
      Approved: 'Approved',
      New: 'New'
    },
    table: {
      selectHidden: 'Select',
      name: 'Name',
      address: 'Address',
      approvalNumber: 'Approval number',
      type: 'Type',
      status: 'Status'
    },
    selectRowPrefix: 'Select',
    search: {
      label: 'Search',
      hint: 'Name, address or approval number',
      button: 'Search'
    },
    noMatches: 'No transporters match your search.',
    shownCount: (count) =>
      `${count} ${count === 1 ? 'transporter' : 'transporters'} shown`,
    add: 'Add a transporter',
    errors: {
      transporterRequired: 'Select a transporter from the list',
      transporterNoLongerAvailable:
        'Select a transporter from the list. The one you chose is no longer available.'
    }
  },
  transporterAdd: {
    title: 'Choose a transporter type',
    legend: 'What type of transporter will move the animals?',
    warning:
      'Before you add this transporter, please ensure you have already searched for it first.',
    options: {
      Private: {
        text: 'Private transporter'
      },
      Commercial: {
        text: 'Commercial',
        hint: 'This can only be a commercial transporter from Northern Ireland.'
      }
    }
  },
  transportersSelect: {
    title: 'Search for an approved commercial transporter',
    hint: 'Selecting a transporter copies their name, address and approval number into this notification.',
    optionHint: (address, approvalNumber) =>
      `${address} — approval number ${approvalNumber}`,
    errors: {
      transporterRequired: 'Select a transporter from the list'
    }
  },
  commercialTransporterDetails: {
    title: 'Add commercial transporter',
    guidanceTitle: 'Help with transporter authorisation',
    contactHeading: 'Enter contact details',
    fields: {
      approvalNumber: 'Transporter authorisation number',
      nameOrOrganisationName: 'Name or organisation name',
      addressLine1: 'Address line 1',
      addressLine2: 'Address line 2 (optional)',
      townOrCity: 'Town or city',
      county: 'County (optional)',
      postcode: 'Postcode or zip code',
      country: 'Country',
      email: 'Email address',
      phone: 'Phone number'
    },
    telephoneHint: 'For international numbers include the country code',
    country: 'Northern Ireland',
    errors: {
      approvalNumberRequired: 'Enter the transporter authorisation number',
      nameRequired: 'Enter a name or organisation name',
      addressLine1Required: 'Enter address line 1',
      townOrCityRequired: 'Enter a town or city',
      postcodeRequired: 'Enter a postcode or zip code',
      emailRequired: 'Enter an email address',
      telephoneRequired: 'Enter a phone number',
      approvalNumberMaxLength:
        'Transporter authorisation number must be 50 characters or less',
      nameMaxLength: 'Name or organisation name must be 255 characters or less',
      addressLine1MaxLength: 'Address line 1 must be 255 characters or less',
      addressLine2MaxLength: 'Address line 2 must be 255 characters or less',
      townOrCityMaxLength: 'Town or city must be 100 characters or less',
      countyMaxLength: 'County must be 100 characters or less',
      postcodeMaxLength: 'Postcode or zip code must be 12 characters or less',
      emailMaxLength: 'Email address must be 254 characters or less',
      telephoneMaxLength: 'Phone number must be 20 characters or less',
      countryFixed:
        'A commercial transporter you add must be in Northern Ireland'
    }
  },
  privateTransporterDetails: {
    title: 'Add private transporter',
    intro:
      'Enter the name and address of the private transporter moving the animals.',
    contactHeading: 'Enter contact details',
    fields: {
      nameOrOrganisationName: 'Name or organisation name',
      addressLine1: 'Address line 1',
      addressLine2: 'Address line 2 (optional)',
      townOrCity: 'Town or city',
      county: 'County (optional)',
      postcode: 'Postcode or Zip code',
      country: 'Country',
      email: 'Email address',
      phone: 'Phone number'
    },
    telephoneHint: 'For international numbers include the country code',
    countryPlaceholder: 'Select a country',
    errors: {
      nameRequired: 'Enter a name or organisation name',
      addressLine1Required: 'Enter address line 1',
      townOrCityRequired: 'Enter a town or city',
      postcodeRequired: 'Enter a postcode or Zip code',
      countryRequired: 'Select a country',
      telephoneRequired: 'Enter a phone number',
      emailRequired: 'Enter an email address',
      nameMaxLength: 'Name or organisation name must be 255 characters or less',
      addressLine1MaxLength: 'Address line 1 must be 255 characters or less',
      addressLine2MaxLength: 'Address line 2 must be 255 characters or less',
      townOrCityMaxLength: 'Town or city must be 100 characters or less',
      countyMaxLength: 'County must be 100 characters or less',
      postcodeMaxLength: 'Postcode or Zip code must be 12 characters or less',
      countryFromList: 'Select a country from the list',
      countryNoLongerAvailable:
        'The saved country is no longer available. Select a country from the list.',
      telephoneMaxLength: 'Phone number must be 20 characters or less',
      emailMaxLength: 'Email address must be 254 characters or less'
    }
  }
}
