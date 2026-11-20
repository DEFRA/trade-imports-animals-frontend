import {
  createPath,
  dashboardPath,
  pagePath,
  pageRoutePath
} from '../../../../../../shared/paths.js'
import { TEMPLATES } from '../../config.js'
import * as state from '../../../../../../engine/index.js'
import { base, pageRouteOptions } from '../../../../../../shared/kit.js'
import { copyFor } from '../../../../../../shared/copy.js'
import { confirmationPage as page } from './page.js'
import { declarationPage } from '../declaration/page.js'
import { copy as en } from './copy/copy.en.js'
import { copy as cy } from './copy/copy.cy.js'
import { outstandingItems } from './outstanding.js'
import { organisationIdOf } from '../../../../../../../common/helpers/organisation-id.js'

const view = `${TEMPLATES}/features/confirmation/template`

const copy = copyFor({ en, cy })

const get = async (request, h) => {
  const { journey, answers, evaluation } = await state.get(request, h)
  if (journey.status !== state.SUBMITTED) {
    request.logger.info(
      {
        journeyId: journey.journeyId,
        status: journey.status,
        organisationId: organisationIdOf(request),
        refusal: 'not-submitted'
      },
      'Confirmation refused'
    )
    return h.redirect(pagePath(journey.journeyId, declarationPage.slug))
  }
  return h.view(view, {
    ...base(copy.title, { journey, showJourneyStrip: false }),
    copy,
    referenceNumber: journey.journeyId,
    outstandingItems: outstandingItems(answers, evaluation),
    dashboardHref: dashboardPath(),
    createAction: createPath()
  })
}

export const routes = [
  {
    method: 'GET',
    path: pageRoutePath(page.slug),
    options: pageRouteOptions(page),
    handler: get
  }
]
