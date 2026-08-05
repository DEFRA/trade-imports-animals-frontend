import * as state from '../../../../../../../engine/index.js'
import { copyFor } from '../../../../../../../shared/copy.js'
import * as kit from '../../../../../../../shared/kit.js'
import { pagePath } from '../../../../../../../shared/paths.js'
import { TEMPLATES } from '../../../config.js'
import { copy as cy } from '../copy/copy.cy.js'
import { copy as en } from '../copy/copy.en.js'
import {
  consignorConfirmationPage as page,
  consignorPickerPage
} from '../page.js'

export const meta = { ...page, collects: [] }

const view = `${TEMPLATES}/features/traders/consignor-confirmation/consignor-confirmation`
const copy = copyFor({ en, cy }).consignorConfirmation

const get = async (request, h) => {
  const { journey } = await state.get(request, h)
  return h.view(view, {
    ...kit.base(copy.pageTitle, { journey }),
    copy
  })
}

const post = (request, h) => {
  const target =
    kit.hubExitTarget(request) ??
    pagePath(request.params.journeyId, consignorPickerPage.slug)
  return h.redirect(kit.withChangeContext(request, target))
}

export const routes = kit.pageRoutes(page, { get, post })
