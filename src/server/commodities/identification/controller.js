import { createLogger } from '../../common/helpers/logging/logger.js'
import {
  getSessionValue,
  setSessionValue
} from '../../common/helpers/session-helpers.js'
import { notificationClient } from '../../common/clients/notification-client.js'
import { getTraceId } from '@defra/hapi-tracing'
import { toObject } from '../../common/helpers/object-helpers.js'

const logger = createLogger()

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
        speciesLst
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
      const referenceNumber = getSessionValue(_request, 'referenceNumber')

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
        await notificationClient.submit(_request, traceId)
        logger.info('Notification saved successfully')
      } catch (error) {
        logger.error(`Failed to submit notification: ${error.message}`)
      }

      return h.redirect('/additional-details', { referenceNumber })
    }
  }
}
