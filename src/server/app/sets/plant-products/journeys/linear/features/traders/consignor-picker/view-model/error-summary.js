// With no rows there is no radio group to anchor at, so the summary link
// targets the search input — clearing or widening the search is what brings the
// rows back.
export const errorSummary = (error, hasRows, sharedCopy) =>
  error
    ? {
        titleText: sharedCopy.errorSummary.title,
        errorList: [{ text: error, href: hasRows ? '#party' : '#q' }]
      }
    : null
