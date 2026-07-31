import { pagePath } from '../../../../../../../../config.js'
import {
  pageOfObligation,
  slugOfPage
} from '../../../../../../../../flow/dispatch.js'
import { copyFor } from '../../../../../../../../shared/copy.js'
import { copy as en } from '../../copy/copy.en.js'
import { copy as cy } from '../../copy/copy.cy.js'

const copy = copyFor({ en, cy })

export const withChange = (href) => `${href}?change=1`

export const changeHref = (journeyId, obligationId) =>
  withChange(pagePath(journeyId, slugOfPage(pageOfObligation(obligationId))))

export const changeAction = (journeyId, obligationId, visuallyHiddenText) => ({
  items: [
    {
      href: changeHref(journeyId, obligationId),
      text: copy.change,
      visuallyHiddenText
    }
  ]
})

export const editableActions = (readOnly, actions) =>
  readOnly ? {} : { actions }
