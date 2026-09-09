export const copy = {
  title: 'Add the county parish holding number (CPH)',
  cph: {
    legend: 'CPH number',
    hint: 'For example, 12/345/6789.',
    county: 'County',
    parish: 'Parish',
    holding: 'Holding number'
  },
  help: {
    summary: 'What is a CPH number?',
    definition:
      'A county parish holding (CPH) number is a unique 9-digit number used to identify land and buildings where livestock are kept, moved or handled.',
    whereToFind:
      'You can find your CPH number on documents from the Animal and Plant Health Agency (APHA).'
  },
  errors: {
    cphRequired: 'Enter a CPH number',
    countyRequired: 'Enter the county',
    countyLength: 'County must be 2 digits',
    countyDigitsOnly: 'County must only contain numbers',
    parishRequired: 'Enter the parish',
    parishLength: 'Parish must be 3 digits',
    parishDigitsOnly: 'Parish must only contain numbers',
    holdingRequired: 'Enter the holding number',
    holdingLength: 'Holding number must be 4 digits',
    holdingDigitsOnly: 'Holding number must only contain numbers'
  }
}
