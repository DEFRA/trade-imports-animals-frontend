import * as state from '../../../../../../engine/index.js'
import { copyFor } from '../../../../../../shared/copy.js'
import { base, routeOptions } from '../../../../../../shared/kit.js'
import {
  dashboardPath,
  hubPath,
  pageRoutePath
} from '../../../../../../shared/paths.js'
import { TEMPLATES } from '../../config.js'
import { copy as cy } from './copy/copy.cy.js'
import { copy as en } from './copy/copy.en.js'
import { confirmationPage as page } from './page.js'

const CUSTOMS_DOCUMENT_CODE = 'C085'
const view = `${TEMPLATES}/features/confirmation/template`
const copy = copyFor({ en, cy })

const customsDeclarationReference = (referenceNumber) => referenceNumber

const get = async (request, h) => {
  const { journey } = await state.get(request, h)
  if (journey.status !== state.SUBMITTED) {
    return h.redirect(hubPath(journey.journeyId))
  }

  return h.view(view, {
    ...base(copy.title, { journeyId: journey.journeyId }),
    copy,
    referenceNumber: journey.journeyId,
    customsDeclarationReference: customsDeclarationReference(journey.journeyId),
    customsDocumentCode: CUSTOMS_DOCUMENT_CODE,
    inspectionStatus: copy.inspection.notRequired,
    dashboardHref: dashboardPath()
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
