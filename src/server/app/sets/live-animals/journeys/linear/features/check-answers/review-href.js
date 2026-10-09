import { pagePath } from '../../../../../../shared/paths.js'
import { CYA_SLUG } from '../../../../../../shared/kit.js'

/** The review page, as the declaration sends a trader back to it.
 *
 * `changed` raises the shared "this notification was updated" banner
 * (`staleAction`). `refused` asks the review to move focus to its error
 * summary, as it did when it re-rendered a refused Continue in place. */
export const reviewHref = (
  journeyId,
  { changed = false, refused = false } = {}
) => {
  const query = new URLSearchParams()
  if (changed) {
    query.set('staleAction', '1')
  }
  if (refused) {
    query.set('refused', '1')
  }
  const search = query.toString()
  return search
    ? `${pagePath(journeyId, CYA_SLUG)}?${search}`
    : pagePath(journeyId, CYA_SLUG)
}
