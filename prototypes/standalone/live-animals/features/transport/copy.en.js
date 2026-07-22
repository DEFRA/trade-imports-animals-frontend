export const copy = {
  portOfEntry: {
    title: 'Arrival details',
    arrivalDate: {
      label: 'Arrival date at port of entry',
      hint: 'The expected date of arrival at the port of entry. For example, 27/3/2026'
    },
    port: {
      label: 'Port of entry',
      hint: 'Choose where the transporter will enter with the consignment. Start typing to search by port or airport name or code.',
      placeholder: 'Select port of entry'
    },
    means: {
      legend: 'Means of transport to the port of entry',
      options: {
        AIRPLANE: 'Airplane',
        RAILWAY: 'Railway',
        ROAD_VEHICLE: 'Road Vehicle',
        VESSEL: 'Vessel'
      }
    },
    identification: {
      label: 'Transport identification',
      hint: 'To identify the means of transport, enter (one of the following): flight number; train number; road vehicle registration number; vessel name (for ferries, also the road vehicle registration number)'
    },
    documentReference: {
      label: 'Transport document reference',
      hint: 'Enter the reference number on the air waybill, bill of lading, sea waybill, road consignment note (CMR) or other transport document.'
    },
    errors: {
      arrivalDateInvalid: 'Enter a real arrival date',
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
    enterAll: {
      label: 'Enter all countries',
      hint: 'You can add up to 12 countries'
    },
    countryLabel: 'Country',
    placeholder: 'Select a country',
    addAnother: 'Add another country',
    errors: {
      fromList: 'Select countries from the list',
      maxCountries: (max) => `Select up to ${max} countries`,
      selectAtLeastOne:
        'Select at least one country the consignment will travel through'
    }
  },
  transporters: {
    title: 'Transporter',
    legend: 'What type of transporter will move the animals?',
    hint: "We will ask for the transporter's details next.",
    options: {
      Commercial: {
        text: 'Commercial',
        hint: 'A business approved to transport animals — you will choose one from a list'
      },
      Private: {
        text: 'Private',
        hint: 'You or another individual moving the animals — you will give their address'
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
  privateTransporterDetails: {
    title: 'Private transporter details',
    intro:
      'Enter the name and address of the private transporter moving the animals.',
    fields: {
      nameOrOrganisationName: 'Name or organisation name',
      addressLine1: 'Address line 1',
      addressLine2: 'Address line 2 (optional)',
      townOrCity: 'Town or city',
      county: 'County (optional)',
      postalOrZipCode: 'Postal or zip code',
      country: 'Country',
      telephoneNumber: 'Telephone number',
      emailAddress: 'Email address'
    },
    countryPlaceholder: 'Select a country',
    errors: {
      nameRequired: 'Enter a name or organisation name',
      addressLine1Required: 'Enter address line 1',
      townOrCityRequired: 'Enter a town or city',
      postalOrZipCodeRequired: 'Enter a postal or zip code',
      countryRequired: 'Select a country',
      telephoneRequired: 'Enter a telephone number',
      emailRequired: 'Enter an email address',
      nameMaxLength: 'Name or organisation name must be 255 characters or less',
      addressLine1MaxLength: 'Address line 1 must be 255 characters or less',
      addressLine2MaxLength: 'Address line 2 must be 255 characters or less',
      townOrCityMaxLength: 'Town or city must be 100 characters or less',
      countyMaxLength: 'County must be 100 characters or less',
      postalOrZipCodeMaxLength:
        'Postal or zip code must be 12 characters or less',
      countryFromList: 'Select a country from the list',
      telephoneMaxLength: 'Telephone number must be 20 characters or less',
      emailMaxLength: 'Email address must be 254 characters or less'
    }
  }
}
