import { pagePath } from '../../../../../../../../shared/paths.js'
import { withTrail } from '../../../../../../../../shared/kit.js'
import {
  pageOfObligation,
  slugOfPage
} from '../../../../../../../../flow/dispatch.js'
import { copyFor } from '../../../../../../../../shared/copy.js'
import { copy as en } from '../../copy/copy.en.js'
import { copy as cy } from '../../copy/copy.cy.js'

const copy = copyFor({ en, cy })

export const changeHref = (journeyId, changeLinkTrail, obligationId) =>
  withTrail(
    pagePath(journeyId, slugOfPage(pageOfObligation(obligationId))),
    changeLinkTrail
  )

/**
 * The Change action for a card's heading, linking to the page with `slug`.
 */
export const cardAction = (
  journeyId,
  changeLinkTrail,
  slug,
  visuallyHiddenText
) => ({
  items: [
    {
      href: withTrail(pagePath(journeyId, slug), changeLinkTrail),
      text: copy.change,
      visuallyHiddenText
    }
  ]
})

export const editableActions = ({ readOnly, actions }) =>
  readOnly ? {} : { actions }
