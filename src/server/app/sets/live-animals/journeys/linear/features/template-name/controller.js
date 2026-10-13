import {
  newTemplateRoutePath,
  templateNameRoutePath,
  templatePagePath,
  templatesPath
} from '../../../../../../shared/paths.js'
import { TEMPLATES } from '../../config.js'
import * as kit from '../../../../../../shared/kit.js'
import { copyFor } from '../../../../../../shared/copy.js'
import { buildActor } from '../../../../../../../common/helpers/actor-helpers.js'
import * as templates from '../../../../../../services/templates/index.js'
import { beginOpeningRun } from '../../../../../../flow/run-state.js'
import { originPage } from '../origin/page.js'
import { templateTypeQuestionUrl } from '../templates/type-question-url.js'
import { copy as en } from './copy/copy.en.js'
import { copy as cy } from './copy/copy.cy.js'

const view = `${TEMPLATES}/features/template-name/template`

const copy = copyFor({ en, cy })

const LIVE_ANIMALS = 'live-animals'
const GERMINAL_PRODUCTS = 'germinal-products'
const TEMPLATE_TYPES = [LIVE_ANIMALS, GERMINAL_PRODUCTS]
const DEFAULT_TYPE = LIVE_ANIMALS

// The type rides in from the front door's question. Anything it is not one of
// the types a template can have is ignored.
const typeOf = (value) => TEMPLATE_TYPES.find((type) => type === value)

const actorOf = (request) => buildActor(request.auth?.credentials)

// Back goes to the type question once a type is known, carrying the template
// in progress so the question shows the type already chosen; otherwise to the
// templates list.
const backLinkFor = (type, templateId) =>
  type ? templateTypeQuestionUrl({ type, templateId }) : templatesPath()

const render = (h, { templateName, type, templateId }) =>
  h
    .view(view, {
      ...kit.base(copy.title, { backLink: backLinkFor(type, templateId) }),
      copy,
      templateName,
      notificationType: type,
      cancelHref: templatesPath()
    })
    .header('Cache-Control', 'no-store')

const nameFrom = (payload) => String(payload?.templateName ?? '').trim()

const newGet = async (request, h) =>
  render(h, { templateName: '', type: typeOf(request.query.type) })

const nameGet = async (request, h) => {
  const { journeyId } = request.params
  const template = await templates.getFor(actorOf(request)?.id, journeyId)
  if (!template) {
    return h.redirect(templatesPath())
  }
  return render(h, {
    templateName: template.name ?? '',
    type: typeOf(request.query.type) ?? typeOf(template.setId),
    templateId: journeyId
  })
}

const continueToOrigin = async (request, h, templateId) => {
  await beginOpeningRun(request, h, templateId)
  return h.redirect(templatePagePath(templateId, originPage.slug))
}

const newPost = async (request, h) => {
  const type = typeOf(request.payload?.notificationType) ?? DEFAULT_TYPE
  if (type === GERMINAL_PRODUCTS) {
    return h.redirect(templatesPath())
  }
  const actor = actorOf(request)
  const created = await templates.startFor(actor?.id, {
    setId: type,
    name: nameFrom(request.payload),
    organisationId: actor?.organisationId
  })
  return continueToOrigin(request, h, created.id)
}

const namePost = async (request, h) => {
  const { journeyId } = request.params
  const ownerId = actorOf(request)?.id
  const template = await templates.getFor(ownerId, journeyId)
  const type = typeOf(request.payload?.notificationType) ?? template?.setId
  if (!template || type === GERMINAL_PRODUCTS) {
    return h.redirect(templatesPath())
  }
  await templates.updateDetailsFor(ownerId, journeyId, {
    setId: type,
    name: nameFrom(request.payload)
  })
  return continueToOrigin(request, h, journeyId)
}

export const routes = [
  {
    method: 'GET',
    path: newTemplateRoutePath(),
    options: kit.routeOptions,
    handler: newGet
  },
  {
    method: 'POST',
    path: newTemplateRoutePath(),
    options: kit.routeOptions,
    handler: newPost
  },
  {
    method: 'GET',
    path: templateNameRoutePath(),
    options: kit.routeOptions,
    handler: nameGet
  },
  {
    method: 'POST',
    path: templateNameRoutePath(),
    options: kit.routeOptions,
    handler: namePost
  }
]
