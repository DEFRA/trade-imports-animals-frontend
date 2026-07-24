import { BASE, pagePath, pageRoutePath, TEMPLATES } from '../../config.js'
import * as state from '../../engine/index.js'
import { cancelAmendJourney } from '../../engine/journey.js'
import * as kit from '../../shared/kit.js'
import { copyFor } from '../../shared/copy.js'
import { copy as en } from './copy.en.js'
import { copy as cy } from './copy.cy.js'

const view = `${TEMPLATES}/features/cancel-amend/template`
const copy = copyFor({ en, cy })

const HTTP_STATUS_INTERNAL_SERVER_ERROR = 500
const dashboardPath = `${BASE}/home`
const cyaPath = (journeyId) => pagePath(journeyId, kit.CYA_SLUG)
const cancelPath = (journeyId) => pagePath(journeyId, 'cancel-amend')

const nonAmendTarget = (journey) =>
  journey.status === state.SUBMITTED
    ? cyaPath(journey.journeyId)
    : dashboardPath

const render = (h, journey, recoverableError = false) =>
  h.view(view, {
    ...kit.base(copy.title, {
      backLink: cyaPath(journey.journeyId),
      journey,
      recoverableError
    }),
    heading: copy.title,
    copy,
    cancelAction: cancelPath(journey.journeyId),
    noHref: cyaPath(journey.journeyId)
  })

const get = async (request, h) => {
  const { journey } = await state.get(request, h)
  return journey.status === state.AMEND
    ? render(h, journey)
    : h.redirect(nonAmendTarget(journey))
}

const post = async (request, h) => {
  const { journey } = await state.get(request, h)
  if (journey.status !== state.AMEND) {
    return h.redirect(nonAmendTarget(journey))
  }

  let restored
  const failure = await kit.recoverableSave(
    async () => {
      restored = await cancelAmendJourney(request, h, request.params.journeyId)
    },
    () => render(h, journey, true).code(HTTP_STATUS_INTERNAL_SERVER_ERROR)
  )
  if (failure) return failure

  return restored
    ? h.redirect(`${cyaPath(restored.journeyId)}?cancelled=1`)
    : h.redirect(dashboardPath)
}

export const routes = [
  {
    method: 'GET',
    path: pageRoutePath('cancel-amend'),
    options: kit.routeOptions,
    handler: get
  },
  {
    method: 'POST',
    path: pageRoutePath('cancel-amend'),
    options: kit.routeOptions,
    handler: post
  }
]
