import { getTraceId } from '@defra/hapi-tracing'
import { createLogger } from '../../common/helpers/logging/logger.js'
import {
  getSessionValue,
  setSessionValue
} from '../../common/helpers/session-helpers.js'
import { statusCodes } from '../../common/constants/status-codes.js'
import { SUBMISSION_FAILURE_MESSAGE } from '../../common/constants/messages.js'
import { toObject } from '../../common/helpers/object-helpers.js'
import { submitNotification } from '../../common/helpers/notification-helpers.js'
import { toCommodityDetails } from '../../common/helpers/commodity-helpers.js'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const logger = createLogger()
const dirname = path.dirname(fileURLToPath(import.meta.url))
const commodityDetailsPath = path.join(
  dirname,
  '../../common/mock-data/mock-commodity-details.json'
)

const VIEW_NAME = 'commodities/identification/index'
const PAGE_TITLE = 'Description of goods'
const HEADING = 'Commodity'

let commodityDetailsList
try {
  commodityDetailsList = JSON.parse(readFileSync(commodityDetailsPath, 'utf-8'))
} catch (err) {
  logger.error(
    `Failed to load mock commodity details from ${commodityDetailsPath}: ${err.message}`
  )
  throw new Error(
    `Cannot start server: mock-commodity-details.json is missing or invalid. ${err.message}`
  )
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

      return h.view(VIEW_NAME, {
        pageTitle: PAGE_TITLE,
        heading: HEADING,
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

      const referenceNumber = getSessionValue(_request, 'referenceNumber')
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

      try {
        await submitNotification(_request, logger)
      } catch (_error) {
        const traceId = getTraceId() ?? ''
        logger.warn(
          { referenceNumber, traceId },
          'Submit failed; rendering error page'
        )
        return h
          .view(VIEW_NAME, {
            pageTitle: PAGE_TITLE,
            heading: HEADING,
            referenceNumber,
            commodity: commodityJson,
            typeOfCommodity: commodityComplement?.typeOfCommodity,
            speciesLst: commodityComplement?.species ?? [],
            commodityDetails: toCommodityDetails(commodityDetailsList),
            errorList: [{ text: SUBMISSION_FAILURE_MESSAGE }]
          })
          .code(statusCodes.internalServerError)
      }

      return h.redirect('/additional-details')
    }
  }
}
