import { createLogger } from '../../common/helpers/logging/logger.js'
import {
  getSessionValue,
  setSessionValue
} from '../../common/helpers/session-helpers.js'
import { getTraceId } from '@defra/hapi-tracing'
import { getTotal, toObject } from '../../common/helpers/object-helpers.js'
import { submitNotification } from '../../common/helpers/notification-helpers.js'

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

      await submitNotification(_request, traceId, logger)

      return h.redirect('/commodities/identification', { referenceNumber })
    }
  }
}
