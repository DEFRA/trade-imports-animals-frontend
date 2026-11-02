import { pagePath } from '../../../../../../shared/paths.js'
import * as kit from '../../../../../../shared/kit.js'
import {
  animalIdentificationPage,
  commoditiesPage,
  consignmentDetailsPage
} from './page.js'

const commoditiesPagePath = (request) =>
  pagePath(request.params.journeyId, commoditiesPage.slug)

export const commodityQuestionPath = (request) =>
  kit.withChangeContext(request, commoditiesPagePath(request))

export const commodityQuestionHref = (request, opener) =>
  kit.withChangeContext(
    request,
    kit.withReturnMarker(commoditiesPagePath(request), opener.slug)
  )

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
