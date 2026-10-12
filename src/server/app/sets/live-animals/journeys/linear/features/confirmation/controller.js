import {
  createPath,
  dashboardPath,
  pagePath,
  pageRoutePath
} from '../../../../../../shared/paths.js'
import { TEMPLATES } from '../../config.js'
import * as state from '../../../../../../engine/index.js'
import { base, routeOptions } from '../../../../../../shared/kit.js'
import { copyFor } from '../../../../../../shared/copy.js'
import { confirmationPage as page } from './page.js'
import { copy as en } from './copy/copy.en.js'
import { copy as cy } from './copy/copy.cy.js'
import { outstandingItems } from './outstanding.js'
import { declarationPage } from '../declaration/page.js'

const view = `${TEMPLATES}/features/confirmation/template`

const copy = copyFor({ en, cy })

const get = async (request, h) => {
  const { journey } = await state.get(request, h)
  if (!state.isSubmittedStatus(journey.status)) {
    return h.redirect(pagePath(journey.journeyId, declarationPage.slug))
  }
  return h.view(view, {
    ...base(copy.title, { journeyId: journey.journeyId }),
    copy,
    referenceNumber: journey.journeyId,
    outstandingItems: outstandingItems(journey),
    dashboardHref: dashboardPath(),
    createAction: createPath()
  })
}

export const routes = [
  {
    method: 'GET',
    path: pageRoutePath(page.slug),
    options: routeOptions,
    handler: get
  }
]
