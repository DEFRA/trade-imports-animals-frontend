import { pagePath } from '../../../../../../../../shared/paths.js'
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

/**
 * The one Change action a card heading carries, or the transit countries row
 * beside it. A card is a page's worth of answers, so the heading says once where
 * they are changed; the transit countries row is the one row that has a page of
 * its own inside a card.
 *
 * The caller names the page rather than deriving it from a row, because a
 * card's rows can span two pages — roles and addresses shows the CPH number the
 * CPH page collects — and says the page the hub's own task row leads with.
 */
export const changeAction = (journeyId, slug, visuallyHiddenText) => ({
  items: [
    {
      href: withChange(pagePath(journeyId, slug)),
      text: copy.change,
      visuallyHiddenText
    }
  ]
})

export const editableActions = (readOnly, actions) =>
  readOnly ? {} : { actions }
