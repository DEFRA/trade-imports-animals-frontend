// With no rows there is no radio group to anchor at, so the summary link
// targets the create action instead. pp-044b moves that anchor to the search
// input it introduces.
export const errorSummary = (error, hasRows, sharedCopy) =>
  error
    ? {
        titleText: sharedCopy.errorSummary.title,
        errorList: [
          { text: error, href: hasRows ? '#party' : '#add-consignor' }
        ]
      }
    : null
