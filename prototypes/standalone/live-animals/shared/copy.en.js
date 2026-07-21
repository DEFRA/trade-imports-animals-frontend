/**
 * Shared chrome copy — the only copy that legitimately lives outside a
 * feature folder: error-summary title, save-actions buttons, journey-strip
 * tags. Layout strings stay in layout.njk until every view carries
 * `sharedCopy` (hub, check-answers and dashboard build their view models
 * without `kit.base`, so a layout conversion today would blank their
 * chrome).
 */
export const copy = {
  errorSummary: {
    title: 'There is a problem'
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
