import {
  dashboardPath,
  pagePath,
  pageRoutePath,
  TEMPLATES
} from '../../../../../../config.js'
import * as state from '../../../../../../engine/index.js'
import { softDeleteJourney } from '../../../../../../engine/journey.js'
import { HTTP_STATUS_INTERNAL_SERVER_ERROR } from '../../../../../../lib/http-status.js'
import * as kit from '../../../../../../shared/kit.js'
import { copyFor } from '../../../../../../shared/copy.js'
import { copy as en } from './copy/copy.en.js'
import { copy as cy } from './copy/copy.cy.js'

const view = `${TEMPLATES}/features/delete-notification/template`
const copy = copyFor({ en, cy })

const deletePath = (journeyId) => pagePath(journeyId, 'delete')
const deletable = (journey) =>
  journey.status === state.DRAFT ||
  journey.status === state.SUBMITTED ||
  journey.status === state.AMEND

const render = (h, journey, recoverableError = false) =>
  h.view(view, {
    ...kit.base(copy.title, {
      backLink: dashboardPath(),
      journey,
      recoverableError
    }),
    heading: copy.title,
    copy,
    deleteAction: deletePath(journey.journeyId),
    noHref: dashboardPath()
  })

const get = async (request, h) => {
  const { journey } = await state.get(request, h)
  return deletable(journey) ? render(h, journey) : h.redirect(dashboardPath())
}

const post = async (request, h) => {
  const { journey } = await state.get(request, h)
  if (!deletable(journey)) return h.redirect(dashboardPath())

  const { failure, value: deleted } = await kit.recoverableSave(
    () => softDeleteJourney(request, h, request.params.journeyId),
    () => render(h, journey, true).code(HTTP_STATUS_INTERNAL_SERVER_ERROR)
  )
  if (failure) return failure

  return deleted
    ? h.redirect(`${dashboardPath()}?deleted=1`)
    : h.redirect(dashboardPath())
}

export const routes = [
  {
    method: 'GET',
    path: pageRoutePath('delete'),
    options: kit.routeOptions,
    handler: get
  },
  {
    method: 'POST',
    path: pageRoutePath('delete'),
    options: kit.routeOptions,
    handler: post
  }
]
