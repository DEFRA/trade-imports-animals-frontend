import { pagePath } from '../../../../../../../../../shared/paths.js'
import { consignorPickerPage } from '../../../page.js'

// Built through pagePath so the /plant-products mount prefix comes from the
// active set context rather than being written into the link.
export const resultsHref = (journeyId, { query, page, selectedId }) => {
  const params = new URLSearchParams()
  if (query) params.set('q', query)
  params.set('page', String(page))
  if (selectedId) params.set('selected', selectedId)
  return `${pagePath(journeyId, consignorPickerPage.slug)}?${params.toString()}`
}
