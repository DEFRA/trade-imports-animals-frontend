import { pagePath } from '../../../../../../shared/paths.js'
import { CYA_SLUG } from '../../../../../../shared/kit.js'

// `changed` raises the shared "notification has been updated" banner (`staleAction`).
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
