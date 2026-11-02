import { pagePath } from '../../../../../../../../../shared/paths.js'
import { appendChangeContext } from '../../../../../../../../../shared/kit.js'

export const resultsHref = (
  journeyId,
  party,
  { query, page, selectedId, changing }
) => {
  const params = new URLSearchParams()
  if (query) {
    params.set('q', query)
  }
  params.set('page', String(page))
  if (selectedId) {
    params.set('selected', selectedId)
  }
  const href = `${pagePath(journeyId, party.slug)}?${params.toString()}`
  return changing ? appendChangeContext(href) : href
}
