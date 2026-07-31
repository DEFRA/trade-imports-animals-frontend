export const errorSummary = (error, hasRows, sharedCopy) =>
  error
    ? {
        titleText: sharedCopy.errorSummary.title,
        errorList: [{ text: error, href: hasRows ? '#party' : '#q' }]
      }
    : null
