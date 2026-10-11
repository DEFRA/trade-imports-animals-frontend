import {
  templatePagePath,
  templatePath,
  templatesRoutePath
} from '../../../../../../shared/paths.js'
import { TEMPLATES } from '../../config.js'
import {
  routeOptions,
  sharedCopy,
  surfaceClass
} from '../../../../../../shared/kit.js'
import { copyFor } from '../../../../../../shared/copy.js'
import { buildActor } from '../../../../../../../common/helpers/actor-helpers.js'
import * as templates from '../../../../../../services/templates/index.js'
import { copy as en } from './copy/copy.en.js'
import { copy as cy } from './copy/copy.cy.js'
import { takeSavedTemplate } from './saved-banner.js'
import { templateTitle } from './template-title.js'
import { templateTypeQuestionUrl } from './type-question-url.js'

const view = `${TEMPLATES}/features/templates/template`

const copy = copyFor({ en, cy })

const ownerIdOf = (request) => buildActor(request.auth?.credentials)?.id

const resultsLabel = (total) =>
  total === 0 ? copy.results.none : copy.results.all(total)

const toCard = ({ id, name, setId }) => {
  const title = templateTitle(name)
  return {
    title,
    label: copy.card.label(title),
    category: copy.categories[setId] ?? '',
    viewHref: templatePath(id),
    useAction: templatePagePath(id, 'use')
  }
}

const savedBanner = (saved) =>
  saved ? { heading: copy.saved.heading(templateTitle(saved.name)) } : null

const manageTemplatesGet = async (request, h) => {
  const saved = await templates.listFor(ownerIdOf(request))
  // Read after listing: the banner shows once, on the first Manage templates
  // that renders after the save, so a failed list must not consume it.
  const justSaved = takeSavedTemplate(request)

  return h.view(view, {
    pageTitle: copy.title,
    contentColumnClass: surfaceClass('display'),
    copy,
    sharedCopy,
    createTemplateHref: templateTypeQuestionUrl(),
    resultsLabel: resultsLabel(saved.length),
    savedBanner: savedBanner(justSaved),
    templateCards: saved.map(toCard)
  })
}

export const routes = [
  {
    method: 'GET',
    path: templatesRoutePath(),
    options: routeOptions,
    handler: manageTemplatesGet
  }
]
