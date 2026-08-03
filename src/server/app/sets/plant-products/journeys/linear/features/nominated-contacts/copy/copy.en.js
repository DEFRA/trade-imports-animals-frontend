export const copy = {
  caption: 'Contacts',
  title: 'Nominated contacts (optional)',
  hint: 'Nominate up to 5 contacts. They will be notified if your consignment is chosen for inspection.',
  labels: {
    contactName: 'Name',
    contactEmail: 'Email address',
    contactTelephone: 'Mobile number',
    contactIsAgent: 'This person is an agent'
  },
  table: {
    headers: {
      contactName: 'Name',
      contactEmail: 'Email address',
      contactTelephone: 'Mobile number'
    },
    removeHidden: 'Remove contact details'
  },
  buttons: {
    addAnother: 'Add another person',
    remove: 'Remove'
  },
  maxReached: 'You have added the maximum of 5 nominated contacts.',
  errors: {
    contactNameRequired: 'Enter a name',
    contactNameMax: 'Name must be 32 characters or fewer',
    contactEmailFormat:
      'Enter an email address in the correct format, like name@example.com',
    contactEmailMax: 'Email address must be 255 characters or fewer',
    contactTelephoneFormat:
      'Enter a mobile number in the correct format, like 07700 900 982 or +44 7700 900 982',
    contactTelephoneMax: 'Mobile number must be 30 characters or fewer',
    contactMethodRequired: 'Enter an email address or mobile number'
  }
}
