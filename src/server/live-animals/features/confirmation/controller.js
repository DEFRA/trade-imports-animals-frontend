import { BASE, hubPath, pageRoutePath, TEMPLATES } from '../../config.js'
import * as state from '../../engine/index.js'
import { base, open } from '../../shared/kit.js'
import { copyFor } from '../../shared/copy.js'
import { dashboardPage } from '../dashboard/page.js'
import { confirmationPage as page } from './page.js'
import { copy as en } from './copy.en.js'
import { copy as cy } from './copy.cy.js'

const view = `${TEMPLATES}/features/confirmation/template`

const copy = copyFor({ en, cy })

const dateText = (value) =>
  new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })

const get = async (request, h) => {
  const { journey } = await state.get(request, h)
  if (journey.status !== state.SUBMITTED) {
    return h.redirect(hubPath(journey.journeyId))
  }
  return h.view(view, {
    ...base(copy.title, { journeyId: journey.journeyId }),
    copy,
    referenceNumber: journey.journeyId,
    submissionDate: dateText(journey.submittedAt),
    dashboardHref: `${BASE}/${dashboardPage.slug}`
  })
}

export const routes = [
  {
    method: 'GET',
    path: pageRoutePath(page.slug),
    options: open,
    handler: get
  }
]
