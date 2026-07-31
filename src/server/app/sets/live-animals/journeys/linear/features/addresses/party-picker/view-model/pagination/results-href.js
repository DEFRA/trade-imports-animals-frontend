import { pagePath } from '../../../../../../../../../config.js'

export const resultsHref = (journeyId, party, { query, page, selectedId }) => {
  const params = new URLSearchParams()
  if (query) params.set('q', query)
  params.set('page', String(page))
  if (selectedId) params.set('selected', selectedId)
  return `${pagePath(journeyId, party.slug)}?${params.toString()}`
}
