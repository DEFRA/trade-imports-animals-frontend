export const copy = {
  title: 'Contact details',
  legend: 'Contact details',
  intro1:
    'These are the details we have for you. Make sure they are up to date.',
  intro2:
    'We will use these details if your consignment is chosen for inspection.',
  fields: {
    responsiblePersonName: { label: 'Name' },
    responsiblePersonEmail: { label: 'Email address' },
    responsiblePersonTelephone: { label: 'Mobile number' }
  },
  errors: {
    nameRequired: 'Enter your name',
    nameMax: 'Name must be 32 characters or fewer',
    emailOrTelephoneRequired: 'Enter an email address or mobile number',
    emailFormat:
      'Enter an email address in the correct format, like name@example.com',
    emailMax: 'Email address must be 255 characters or fewer',
    telephoneFormat:
      'Enter a mobile number in the correct format, like 07700 900 982 or +44 7700 900 982',
    telephoneMax: 'Mobile number must be 30 characters or fewer'
  }
}
