import { createLogger } from '../../common/helpers/logging/logger.js'
import {
  getSessionValue,
  setSessionValue
} from '../../common/helpers/session-helpers.js'
import { notificationClient } from '../../common/clients/notification-client.js'
import { getTraceId } from '@defra/hapi-tracing'
import { getTotal, toObject } from '../../common/helpers/object-helpers.js'

const logger = createLogger()

export const commodityDetailsController = {
  get: {
    handler(_request, h) {
      logger.info(
        `Commodity: ${getSessionValue(_request, 'commodity')} details page`
      )

      const referenceNumber = getSessionValue(_request, 'referenceNumber')
      const commodity = getSessionValue(_request, 'commodity')
      const commodityComplement = (commodity?.commodityComplement ?? []).at(-1)
      const speciesLst = commodityComplement?.species ?? []
      const typeOfCommodity = commodityComplement?.typeOfCommodity

      return h.view('commodities/details/index', {
        pageTitle: 'Description of goods',
        heading: 'Commodity',
        referenceNumber,
        commodity,
        typeOfCommodity,
        speciesLst,
        totalNoOfAnimals: commodityComplement?.totalNoOfAnimals ?? 0,
        totalNoOfPackages: commodityComplement?.totalNoOfPackages ?? 0
      })
    }
  },
  post: {
    async handler(_request, h) {
      logger.info(
        `Commodity: ${getSessionValue(_request, 'commodity')} details page`
      )

      const traceId = getTraceId() ?? ''
      const commodity = getSessionValue(_request, 'commodity')
      const referenceNumber = getSessionValue(_request, 'referenceNumber')

      const commodityComplement = (commodity?.commodityComplement ?? []).at(-1)
      const speciesLst = commodityComplement?.species ?? []

      const noOfAnimals = Object.values(_request.payload.noOfAnimals ?? [])
      const noOfPackages = Object.values(_request.payload.noOfPackages ?? [])

      commodityComplement.species = speciesLst.map((species, index) => ({
        ...species,
        noOfAnimals: noOfAnimals[index],
        noOfPackages: noOfPackages[index]
      }))

      commodityComplement.totalNoOfAnimals = getTotal(noOfAnimals)
      commodityComplement.totalNoOfPackages = getTotal(noOfPackages)

      const commodityJson = toObject(commodity, 'commodity')
      commodityJson.commodityComplement = [commodityComplement]
      setSessionValue(_request, 'commodity', commodityJson)

      try {
        await notificationClient.submit(_request, traceId)
        logger.info('Notification saved successfully')
      } catch (error) {
        logger.error(`Failed to submit notification: ${error.message}`)
      }

      return h.redirect('/commodities/details', { referenceNumber })
    }
  }
}
