export const copy = {
  title: 'Add the county parish holding number (CPH)',
  cph: {
    label: 'CPH number',
    hint: 'For example, 123456789 or 123/456/789.'
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
    cphLength: 'CPH number must be exactly 9 digits',
    cphDigitsOnly: 'CPH number must only contain numbers'
  }
}
