import { pagePath } from '../../../../../../shared/paths.js'
import * as kit from '../../../../../../shared/kit.js'
import {
  animalIdentificationPage,
  commoditiesPage,
  consignmentDetailsPage
} from './page.js'

const commodityQuestionPagePath = (request) =>
  pagePath(request.params.journeyId, commoditiesPage.slug)

export const commodityQuestionPath = (request) =>
  kit.withChangeContext(request, commodityQuestionPagePath(request))

export const commodityQuestionHref = (request, opener) => {
  const RETURN_PARAMETER = 'return'
  const query = new URLSearchParams({ [RETURN_PARAMETER]: opener.slug })
  return kit.withChangeContext(
    request,
    `${commodityQuestionPagePath(request)}?${query}`
  )
}

export const commodityQuestionReturn = (request) => {
  const openerSlugs = [
    consignmentDetailsPage.slug,
    animalIdentificationPage.slug
  ]
  const { honouredSlug, refusedMarker } = kit.readReturnMarker(
    request,
    openerSlugs
  )
  if (honouredSlug) {
    return {
      honouredReturn: kit.withChangeContext(
        request,
        pagePath(request.params.journeyId, honouredSlug)
      )
    }
  }
  return refusedMarker === undefined ? {} : { refusedMarker }
}
