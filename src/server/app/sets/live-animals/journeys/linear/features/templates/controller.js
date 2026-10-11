import { templatesRoutePath } from '../../../../../../shared/paths.js'
import { TEMPLATES } from '../../config.js'
import {
  routeOptions,
  sharedCopy,
  surfaceClass
} from '../../../../../../shared/kit.js'
import { copyFor } from '../../../../../../shared/copy.js'
import { buildActor } from '../../../../../../../common/helpers/actor-helpers.js'
import * as templates from '../../../../../../services/templates/index.js'
import { formatDisplayMoment } from '../dashboard/notification-helper.js'
import { copy as en } from './copy/copy.en.js'
import { copy as cy } from './copy/copy.cy.js'
import { templateTypeQuestionUrl } from './type-question-url.js'

const view = `${TEMPLATES}/features/templates/template`

const copy = copyFor({ en, cy })

const ownerIdOf = (request) => buildActor(request.auth?.credentials)?.id

const resultsLabel = (total) =>
  total === 0 ? copy.results.none : copy.results.all(total)

const toCard = ({ name, created }) => ({
  name,
  created: formatDisplayMoment(created)
})

const manageTemplatesGet = async (request, h) => {
  const saved = await templates.listFor(ownerIdOf(request))

  return h.view(view, {
    pageTitle: copy.title,
    contentColumnClass: surfaceClass('display'),
    copy,
    sharedCopy,
    createTemplateHref: templateTypeQuestionUrl(),
    resultsLabel: resultsLabel(saved.length),
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
