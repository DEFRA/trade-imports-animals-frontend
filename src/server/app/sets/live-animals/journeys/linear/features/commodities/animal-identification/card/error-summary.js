import { copyFor } from '../../../../../../../../shared/copy.js'
import { copy as sharedEn } from '../../../../../../../../shared/copy.en.js'
import { copy as sharedCy } from '../../../../../../../../shared/copy.cy.js'

const sharedCopy = copyFor({ en: sharedEn, cy: sharedCy })

const cardField = (index) => `identification-card-${index}`

export const refusedFieldsOf = (errors, cardErrors) => ({
  ...errors,
  ...Object.fromEntries(
    cardErrors.map(({ index, text }) => [cardField(index), text])
  )
})

export const summaryOf = (errors, cardErrors) => {
  const errorList = [
    ...Object.entries(errors).map(([field, text]) => ({
      text,
      href: `#${field}`
    })),
    ...cardErrors.map(({ index, text }) => ({
      text,
      href: `#${cardField(index)}`
    }))
  ]
  return errorList.length
    ? { titleText: sharedCopy.errorSummary.title, errorList }
    : null
}
