import {
  pageOfObligation,
  slugOfPage
} from '../../../../../../../../flow/dispatch.js'
import { pagePath } from '../../../../../../../../shared/paths.js'
import { copyFor } from '../../../../../../../../shared/copy.js'
import { copy as cy } from '../../copy/copy.cy.js'
import { copy as en } from '../../copy/copy.en.js'

const copy = copyFor({ en, cy })

export const withChange = (href) => `${href}?change=1`

export const changeHref = (obligationName, journeyId) =>
  withChange(pagePath(journeyId, slugOfPage(pageOfObligation(obligationName))))

export const changeAction = (
  obligationName,
  journeyId,
  visuallyHiddenText
) => ({
  items: [
    {
      href: changeHref(obligationName, journeyId),
      text: copy.change,
      visuallyHiddenText
    }
  ]
})
