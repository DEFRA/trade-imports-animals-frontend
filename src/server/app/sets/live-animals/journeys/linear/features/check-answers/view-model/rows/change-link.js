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

export const changeHref = ({ journeyId, changeLinkTrail }, obligationId) =>
  withTrail(
    pagePath(journeyId, slugOfPage(pageOfObligation(obligationId))),
    changeLinkTrail
  )

/**
 * The Change action linking to the page with `slug`.
 *
 * @param {{ journeyId: string, changeLinkTrail: string[] }} changeContext - the
 * journey and the trail the link carries.
 * @param {string} slug - the page the link opens.
 * @param {string} visuallyHiddenText - the text only a screen reader hears.
 */
export const changeAction = (
  { journeyId, changeLinkTrail },
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
