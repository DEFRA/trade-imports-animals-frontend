export const copy = {
  title: 'Main reason for import',
  legend: 'What is the main reason for importing the animals?',
  reasonHints: {
    internalMarket:
      'For imports of animals intended for sale or use in Great Britain (England, Scotland or Wales).',
    transhipmentOrOnwardTravel:
      'For animals intended for direct travel to a third country, that will stay only within the same port or airport in Great Britain while moving to another means of transport.',
    transit:
      'For animals moving through Great Britain for direct travel to a third country, that will enter Great Britain at one port or airport and leave from a different one within England, Scotland or Wales.',
    reEntry:
      'For animals authorised for re-entry, or rejected exports re-entering Great Britain.',
    temporaryAdmissionHorses: 'For horses authorised for temporary entry.'
  },
  purpose: {
    legend: 'Purpose in the internal market',
    hints: {
      'transfer-of-ownership-sale-gift':
        'Any movement of an animal that has as its aim the sale of or the transfer of ownership of the animal from one person or entity to another. For example, animals that have been sold and are being moved to a new owner or will be sold once in Great Britain, purchases from a breeder/shop overseas and where an animal is being moved to a new owner with no sale involved (for example a gift).',
      'transfer-of-ownership-rescue':
        'Ownership of animal/s changes from one person or entity to another through rehoming and is adopted/fostered by new families, with or without an exchange or donation of money.',
      breeding:
        'Animals for reproduction. This includes animals intended to contribute to the genetic pool of a breeding program, improve livestock quality, or produce offspring.',
      research: 'Animals for use in scientific or medical research.',
      'racing-competition-show-or-training':
        'Animals to participate in competitive or training events.',
      'approved-premises-or-body':
        'Animals for exhibition, zoos, collections, or conservation programmes where a licence or approval is needed.',
      'companion-animal-not-for-resale-or-rehoming':
        "Privately owned animals being imported under the commercial rules as the animal is unable to meet the non-commercial requirements, for example, one or more animals being transported by a commercial transporter without their owner or an authorised person, owner that is not traveling within five days of the animals' movement or a group of five or more animals being accompanied by their owner.",
      production:
        'Animals that are farmed for the production of meat, milk, eggs, wool or any other animal product or by-product.',
      slaughter:
        'Animals to be slaughtered and processed for meat production shortly after arrival into Great Britain.',
      fattening: 'Animals to be fattened for meat production.',
      restocking:
        'To replenish or enhance populations of species, for example, restocking of game or fish.'
    }
  },
  country: {
    label: 'Destination country',
    placeholder: 'Select a country'
  },
  port: {
    label: 'Port of exit',
    placeholder: 'Select port of exit'
  },
  date: {
    label: 'Exit date',
    hint: 'For example, 27/3/2026'
  },
  errors: {
    purposeRequired: 'Select a purpose in the internal market',
    countryRequired: 'Select a destination country',
    portRequired: 'Select a port of exit',
    dateRequired: 'Enter an exit date',
    dateInvalid: 'Enter a real date'
  }
}
