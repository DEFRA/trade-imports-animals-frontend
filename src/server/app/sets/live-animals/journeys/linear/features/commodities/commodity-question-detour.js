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
  kit.carryTrail(request, commoditiesPagePath(request))

export const commodityQuestionHref = (request, opener) =>
  kit.carryTrail(
    request,
    kit.withReturnMarker(commoditiesPagePath(request), opener.slug)
  )

export const commodityQuestionReturn = (request) => {
  const openerSlugs = [
    consignmentDetailsPage.slug,
    animalIdentificationPage.slug
  ]
  const { honouredSlug } = kit.readReturnMarker(request, openerSlugs)
  return honouredSlug
    ? {
        honouredReturn: kit.carryTrail(
          request,
          pagePath(request.params.journeyId, honouredSlug)
        )
      }
    : {}
}
