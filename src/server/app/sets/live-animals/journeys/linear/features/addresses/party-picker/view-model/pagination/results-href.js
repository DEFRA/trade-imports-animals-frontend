import { pagePath } from '../../../../../../../../../shared/paths.js'

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
  // Built here rather than appended, because this href already carries a query
  // string.
  if (changing) {
    params.set('change', '1')
  }
  return `${pagePath(journeyId, party.slug)}?${params.toString()}`
}
