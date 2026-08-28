/**
 * Shared chrome copy — the only copy that legitimately lives outside a
 * feature folder: the layout (service name, service navigation,
 * back link, error title prefix), error-summary title, save-actions
 * buttons and journey-strip tags. Every view reaches it as `sharedCopy`
 * (via `kit.base`, or passed directly by the controllers that build
 * their view models without it).
 */
export const copy = {
  layout: {
    serviceName: 'Import notification service',
    errorTitlePrefix: 'Error: ',
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
  errorSummary: {
    title: 'There is a problem'
  },
  recoverableError: {
    title: 'There is a problem',
    body: 'Sorry, there is a problem with the service. Your answers on this page have been saved. Try again in a few minutes.'
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
    saveAndContinue: 'Save and continue',
    saveAndReturnToHub: 'Save and return to hub',
    cancelAndReturnToHub: 'Cancel and return to hub'
  },
  journeyStrip: {
    draft: 'Draft',
    submitted: 'Submitted',
    amend: 'Amending',
    deleted: 'Deleted'
  }
}

/**
 * Default validator messages — the fallbacks `lib/validate` composers use
 * when a call site passes no feature message. A separate export (not a
 * `copy` key) because parameterised defaults are function leaves and
 * `copy-leaves.js`'s `isCopyLeaf` pins string-only leaves. Locale-swappable
 * the same way: a `copy.cy.js` exports its own `validatorDefaults`.
 */
export const validatorDefaults = {
  oneOf: 'Select a valid option',
  postcode: 'Enter a valid postcode',
  vehicleReg: 'Enter a valid registration number',
  ukPhone: 'Enter a valid UK telephone number',
  date: 'Enter a valid date',
  wholeNumber: 'Enter a whole number',
  maxLength: (max) => `Enter ${max} characters or fewer`,
  numberBetween: (min, max) => `Enter a number between ${min} and ${max}`
}
