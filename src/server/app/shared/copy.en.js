export const copy = {
  layout: {
    serviceName: 'Import notification service',
    errorTitlePrefix: 'Error: ',
    govukSuffix: 'GOV.UK',
    back: 'Back',
    phaseBanner: {
      tag: 'Alpha',
      bodyPrefix: 'This is a new service. Help us improve it and',
      feedbackLinkText: 'give your feedback by email'
    },
    serviceNavigation: {
      menuButton: 'Menu',
      dashboard: 'Dashboard',
      addressBook: 'Address book',
      manageAccount: 'Manage account',
      logOut: 'Log out'
    },
    footer: {
      privacy: 'Privacy',
      cookies: 'Cookies',
      accessibility: 'Accessibility statement'
    }
  },
  unauthorised: {
    title: 'Sorry, we are unable to sign you in',
    heading: 'Sorry, we are unable to sign you in.',
    bodyPrefix: 'Please',
    signInLinkText: 'try again'
  },
  errorSummary: {
    title: 'There is a problem'
  },
  recoverableError: {
    title: 'There is a problem',
    body: 'Sorry, there is a problem with the service. Your answers on this page have been saved. Try again in a few minutes.'
  },
  dateExample: 'For example, 27/3/2026',
  errorPage: {
    notFound: 'Page not found',
    forbidden: 'Forbidden',
    unauthorized: 'You need to sign in to view this page',
    badRequest: 'There is a problem with your request',
    unexpected: 'Something went wrong'
  },
  staleActionRejected: {
    title: 'The notification has been updated',
    body: 'This notification was updated since you opened it. Review the details and try again.'
  },
  notificationActions: {
    copy: {
      text: 'Copy as new',
      successTitle: 'Notification copied',
      successBody: 'A new draft notification has been created.'
    },
    delete: {
      text: 'Delete',
      successTitle: 'Notification deleted',
      successBody: 'The notification has been deleted.'
    }
  },
  saveActions: {
    saveAndReturn: 'Save and return',
    saveAndContinue: 'Save and continue',
    saveAndReturnToHub: 'Save and return to overview',
    cancelAndReturnToHub: 'Cancel and return to overview'
  },
  journeyStrip: {
    draft: 'Draft',
    submitted: 'Submitted',
    amend: 'Amend',
    cancelAmend: 'Cancel amend',
    deleted: 'Deleted'
  },
  addressHandshake: {
    addNewAddress: 'Add a new address',
    addedBanner: {
      title: 'Success',
      text: (name) => `${name} address added to your address book`
    },
    errors: {
      notFound:
        'The address could not be found in your address book. Select another address or try adding it again.',
      unavailable:
        'The address book could not be reached. Your answers on this page have been saved. Try again in a few minutes.'
    }
  }
}

/**
 * Default validator messages. Each is a string, or a function of the rule's
 * limits that returns one.
 */
export const validatorDefaults = {
  oneOf: 'Select a valid option',
  postcode: 'Enter a valid postcode',
  vehicleReg: 'Enter a valid registration number',
  ukPhone: 'Enter a valid UK telephone number',
  date: 'Enter a valid date',
  time: 'Enter a real time, like 14:30',
  wholeNumber: 'Enter a whole number',
  maxLength: (max) => `Enter ${max} characters or fewer`,
  numberBetween: (min, max) => `Enter a number between ${min} and ${max}`
}
