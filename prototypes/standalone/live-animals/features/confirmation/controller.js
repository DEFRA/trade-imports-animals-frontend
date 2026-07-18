import { hubPath, pagePath, TEMPLATES } from '../../config.js'
import * as state from '../../engine/index.js'
import { base, open } from '../../shared/kit.js'
import { dashboardPage } from '../dashboard/page.js'
import { confirmationPage as page } from './page.js'

const view = `${TEMPLATES}/features/confirmation/template`

const dateText = (value) =>
  new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })

const get = async (request, h) => {
  const { journey } = await state.get(request, h)
  if (journey.status !== state.SUBMITTED) return h.redirect(hubPath())
  return h.view(view, {
    ...base('Import notification submitted'),
    referenceNumber: journey.journeyId,
    submissionDate: dateText(journey.submittedAt),
    dashboardHref: pagePath(dashboardPage.slug)
  })
}

export const routes = [
  { method: 'GET', path: pagePath(page.slug), options: open, handler: get }
]
