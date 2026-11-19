import { pagePath } from '../../../../../../../../shared/paths.js'
import { withTrail } from '../../../../../../../../shared/kit.js'

export const resultsHref = (journeyId, party, { query, selectedId, trail }) => {
  const params = new URLSearchParams()
  if (query) {
    params.set('q', query)
  }
  if (selectedId) {
    params.set('selected', selectedId)
  }
  const href = `${pagePath(journeyId, party.slug)}?${params.toString()}`
  return withTrail(href, trail)
}
