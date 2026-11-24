import { pagePath } from '../../../../../../../../shared/paths.js'
import { withTrail } from '../../../../../../../../shared/kit.js'
import { FIRST_PAGE } from '../../../../../../../../shared/paging.js'

export const resultsHref = (
  journeyId,
  slug,
  { query, page, selectedId, trail }
) => {
  const params = new URLSearchParams()
  if (query) {
    params.set('q', query)
  }
  if (page > FIRST_PAGE) {
    params.set('page', String(page))
  }
  if (selectedId) {
    params.set('selected', selectedId)
  }
  const search = params.toString()
  const path = pagePath(journeyId, slug)
  return withTrail(search ? `${path}?${search}` : path, trail)
}
