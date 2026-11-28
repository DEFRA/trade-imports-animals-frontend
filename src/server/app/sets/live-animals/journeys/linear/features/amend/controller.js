import {
  dashboardPath,
  pagePath,
  pageRoutePath
} from '../../../../../../shared/paths.js'
import { TEMPLATES } from '../../config.js'
import {
  amendableJourney,
  amendJourney
} from '../../../../../../engine/journey.js'
import { organisationIdOf } from '../../../../../../../common/helpers/organisation-id.js'
import { HTTP_STATUS_INTERNAL_SERVER_ERROR } from '../../../../../../lib/http-status.js'
import * as kit from '../../../../../../shared/kit.js'
import { copyFor } from '../../../../../../shared/copy.js'
import { copy as en } from './copy/copy.en.js'
import { copy as cy } from './copy/copy.cy.js'
import { amendPage as page } from './page.js'

const view = `${TEMPLATES}/features/amend/template`
const copy = copyFor({ en, cy })

const viewPath = (journeyId) => pagePath(journeyId, kit.CYA_SLUG)
const amendPath = (journeyId) => pagePath(journeyId, page.slug)

const render = (h, journey, { recoverableError = false } = {}) =>
  h.view(view, {
    ...kit.base(copy.title, {
      backLink: viewPath(journey.journeyId),
      journey,
      recoverableError
    }),
    heading: copy.title,
    copy,
    confirmAction: amendPath(journey.journeyId),
    goBackHref: viewPath(journey.journeyId)
  })

const get = async (request, h) => {
  const journey = await amendableJourney(request, h, request.params.journeyId)
  return journey ? render(h, journey) : h.redirect(dashboardPath())
}

const post = async (request, h) => {
  const { journeyId } = request.params
  const journey = await amendableJourney(request, h, journeyId)
  if (!journey) {
    return h.redirect(dashboardPath())
  }

  const { failure, value: started } = await kit.recoverableSave(
    request,
    () => amendJourney(request, h, journeyId),
    () =>
      render(h, journey, { recoverableError: true }).code(
        HTTP_STATUS_INTERNAL_SERVER_ERROR
      )
  )
  if (failure) {
    return failure
  }

  if (!started) {
    return h.redirect(dashboardPath())
  }

  request.logger.info(
    {
      journeyId: started.journeyId,
      organisationId: organisationIdOf(request)
    },
    'Amendment started'
  )
  return h.redirect(
    kit.withTrail(pagePath(started.journeyId, kit.CYA_SLUG), [
      kit.TRAIL_START.dashboard
    ])
  )
}

export const routes = [
  {
    method: 'GET',
    path: pageRoutePath(page.slug),
    options: kit.pageRouteOptions(page),
    handler: get
  },
  {
    method: 'POST',
    path: pageRoutePath(page.slug),
    options: kit.pageRouteOptions(page),
    handler: post
  }
]
