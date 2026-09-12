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
 * The one Change link a card carries, level with its title (design release 1).
 * Rows carry none: a card is a page's worth of answers, so the card says once
 * where they are changed.
 *
 * The card names its page rather than deriving it from a row, because a card's
 * rows can span two pages — roles and addresses shows the CPH number the CPH
 * page collects. A card has one destination, so it has to say which one, and
 * it says the page the hub's own task row leads with. A conditional second
 * page does not get a second link here: it gets a headed card of its own that
 * carries its own, as cards/movement/transit-countries.js does.
 */
export const cardAction = (journeyId, slug, visuallyHiddenText) => ({
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
