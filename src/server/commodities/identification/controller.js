import { createLogger } from '../../common/helpers/logging/logger.js'
import {
  getSessionValue,
  setSessionValue
} from '../../common/helpers/session-helpers.js'
import { getTraceId } from '@defra/hapi-tracing'
import { toObject } from '../../common/helpers/object-helpers.js'
import { submitNotification } from '../../common/helpers/notification-helpers.js'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const logger = createLogger()
const dirname = path.dirname(fileURLToPath(import.meta.url))
const commodityDetailsPath = path.join(
  dirname,
  '../select/mock-commodity-details.json'
)
const commodityDetailsList = JSON.parse(
  readFileSync(commodityDetailsPath, 'utf-8')
)

function toCommodityDetails(detailsList) {
  if (Array.isArray(detailsList)) {
    return detailsList.length > 0 ? detailsList[0] : null
  }
  return detailsList && typeof detailsList === 'object' ? detailsList : null
}

export const animalIdentificationDetailsController = {
  get: {
    handler(_request, h) {
      logger.info(
        `Commodity: ${getSessionValue(_request, 'commodity')} - Animal identification details page`
      )

      const referenceNumber = getSessionValue(_request, 'referenceNumber')
      const commodity = getSessionValue(_request, 'commodity')
      const commodityComplement = (commodity?.commodityComplement ?? []).at(-1)
      const speciesLst = commodityComplement?.species ?? []
      const typeOfCommodity = commodityComplement?.typeOfCommodity

      return h.view('commodities/identification/index', {
        pageTitle: 'Description of goods',
        heading: 'Commodity',
        referenceNumber,
        commodity,
        typeOfCommodity,
        speciesLst,
        commodityDetails: toCommodityDetails(commodityDetailsList)
      })
    }
  },
  post: {
    async handler(_request, h) {
      logger.info(
        `Commodity: ${getSessionValue(_request, 'commodity')} - Animal identification details page`
      )

      const traceId = getTraceId() ?? ''
      const commodity = getSessionValue(_request, 'commodity')

      const commodityComplement = (commodity?.commodityComplement ?? []).at(-1)
      const speciesLst = commodityComplement?.species ?? []

      const earTags = speciesLst.map(
        (s) => _request.payload[`earTag-${s.value}`]
      )
      const passports = speciesLst.map(
        (s) => _request.payload[`passport-${s.value}`]
      )

      commodityComplement.species = speciesLst.map((species, index) => ({
        ...species,
        earTag: earTags[index],
        passport: passports[index]
      }))

      const commodityJson = toObject(commodity, 'commodity')
      commodityJson.commodityComplement = [commodityComplement]
      setSessionValue(_request, 'commodity', commodityJson)

      await submitNotification(_request, traceId, logger)

      return h.redirect('/additional-details')
    }
  }
}
