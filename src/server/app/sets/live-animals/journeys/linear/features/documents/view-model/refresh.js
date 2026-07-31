import { pagePath } from '../../../../../../../shared/paths.js'
import * as kit from '../../../../../../../shared/kit.js'
import { documentsPage as page } from '../page.js'

export const getAttempt = (request) => {
  const parsed = Number.parseInt(request.query?.attempt ?? '0', 10)
  return Number.isNaN(parsed) ? 0 : parsed
}

export const refreshHref = (request, attempt) => {
  const base = kit.withChangeContext(
    request,
    pagePath(request.params.journeyId, page.slug)
  )
  const separator = base.includes('?') ? '&' : '?'
  return `${base}${separator}attempt=${attempt}`
}
