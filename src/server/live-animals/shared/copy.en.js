/**
 * Shared chrome copy — the only copy that legitimately lives outside a
 * feature folder: the layout (service name, phase banner, breadcrumbs,
 * back link, error title prefix), error-summary title, save-actions
 * buttons and journey-strip tags. Every view reaches it as `sharedCopy`
 * (via `kit.base`, or passed directly by the controllers that build
 * their view models without it).
 */
export const copy = {
  layout: {
    serviceName: 'Import notification service (standalone)',
    errorTitlePrefix: 'Error: ',
    phaseBanner: {
      tag: 'Prototype',
      html: 'Obligations v2 spike standalone — a non-functional prototype, not a real service.'
    },
    back: 'Back',
    breadcrumbs: {
      prototypes: 'Prototypes',
      serviceHome: 'Import notifications (standalone)'
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
  saveActions: {
    saveAndContinue: 'Save and continue',
    saveAndReturnToHub: 'Save and return to hub',
    cancelAndReturnToHub: 'Cancel and return to hub'
  },
  journeyStrip: {
    draft: 'Draft',
    submitted: 'Submitted'
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
