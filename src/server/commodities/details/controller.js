import { createLogger } from '../../common/helpers/logging/logger.js'
import {
  getSessionValue,
  setSessionValue
} from '../../common/helpers/session-helpers.js'
import { statusCodes } from '../../common/constants/status-codes.js'
import { SUBMISSION_FAILURE_MESSAGE } from '../../common/constants/messages.js'
import { getTotal, toObject } from '../../common/helpers/object-helpers.js'
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

const buildDetailsViewModel = (commodity, referenceNumber) => {
  const commodityComplement = (commodity?.commodityComplement ?? []).at(-1)
  return {
    pageTitle: 'Description of goods',
    heading: 'Commodity',
    referenceNumber,
    commodity,
    typeOfCommodity: commodityComplement?.typeOfCommodity,
    speciesLst: commodityComplement?.species ?? [],
    totalNoOfAnimals: commodityComplement?.totalNoOfAnimals ?? 0,
    totalNoOfPackages: commodityComplement?.totalNoOfPackages ?? 0,
    commodityDetails: toCommodityDetails(commodityDetailsList)
  }
}

export const commodityDetailsController = {
  get: {
    handler: (_request, h) => {
      logger.info(
        `Commodity: ${getSessionValue(_request, 'commodity')} details page`
      )

      // TODO(follow-up): referenceNumber is read from session here, but the POST
      // handler uses submitNotification which sources it via the notification API.
      // These two paths are inconsistent and should be aligned in a follow-up.
      const referenceNumber = getSessionValue(_request, 'referenceNumber')
      const commodity = getSessionValue(_request, 'commodity')

      return h.view(
        'commodities/details/index',
        buildDetailsViewModel(commodity, referenceNumber)
      )
    }
  },
  post: {
    handler: async (_request, h) => {
      logger.info(
        `Commodity: ${getSessionValue(_request, 'commodity')} details page`
      )

      const commodity = getSessionValue(_request, 'commodity')

      const commodityComplement = (commodity?.commodityComplement ?? []).at(-1)
      const speciesLst = commodityComplement?.species ?? []

      const noOfAnimals = speciesLst.map(
        (s) => _request.payload[`noOfAnimals-${s.value}`]
      )
      const noOfPackages = speciesLst.map(
        (s) => _request.payload[`noOfPackages-${s.value}`]
      )

      commodityComplement.species = speciesLst.map((species, index) => ({
        ...species,
        noOfAnimals: noOfAnimals[index],
        noOfPackages: noOfPackages[index]
      }))

      commodityComplement.totalNoOfAnimals = getTotal(noOfAnimals)
      commodityComplement.totalNoOfPackages = getTotal(noOfPackages)

      const commodityJson = toObject(commodity, 'name')
      commodityJson.commodityComplement = [commodityComplement]
      setSessionValue(_request, 'commodity', commodityJson)

      try {
        await submitNotification(_request, logger)
      } catch (_error) {
        logger.warn(
          'submitNotification failed in commodity details POST; rendering error view'
        )
        return h
          .view('commodities/details/index', {
            ...buildDetailsViewModel(
              commodityJson,
              getSessionValue(_request, 'referenceNumber')
            ),
            errorList: [
              {
                text: SUBMISSION_FAILURE_MESSAGE,
                href: '#commodity-details-form'
              }
            ]
          })
          .code(statusCodes.internalServerError)
      }

      return h.redirect('/commodities/identification')
    }
  }
}
