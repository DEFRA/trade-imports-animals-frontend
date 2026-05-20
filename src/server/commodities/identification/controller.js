import { createLogger } from '../../common/helpers/logging/logger.js'
import {
  getSessionValue,
  setSessionValue
} from '../../common/helpers/session-helpers.js'
import { sessionKeys } from '../../common/constants/session-keys.js'
import { statusCodes } from '../../common/constants/status-codes.js'
import { SUBMISSION_FAILURE_MESSAGE } from '../../common/constants/messages.js'
import { toObject } from '../../common/helpers/object-helpers.js'
import { saveNotification } from '../../common/helpers/notification-helpers.js'

const logger = createLogger()

export const animalIdentificationDetailsController = {
  get: {
    handler(_request, h) {
      logger.info(
        `Commodity: ${getSessionValue(_request, sessionKeys.commodity)} - Animal identification details page`
      )

      const referenceNumber = getSessionValue(
        _request,
        sessionKeys.referenceNumber
      )
      const commodity = getSessionValue(_request, sessionKeys.commodity)
      const commodityComplement = (commodity?.commodityComplement ?? []).at(-1)
      const speciesLst = commodityComplement?.species ?? []
      const typeOfCommodity = commodityComplement?.typeOfCommodity

      return h.view('commodities/identification/index', {
        pageTitle: 'Description of goods',
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
        `Commodity: ${getSessionValue(_request, sessionKeys.commodity)} - Animal identification details page`
      )

      const commodity = getSessionValue(_request, sessionKeys.commodity)
      const referenceNumber = getSessionValue(
        _request,
        sessionKeys.referenceNumber
      )

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
      setSessionValue(_request, sessionKeys.commodity, commodityJson)

      try {
        await saveNotification(_request, logger)
      } catch {
        const updatedCommodity = getSessionValue(
          _request,
          sessionKeys.commodity
        )
        const updatedComplement = (
          updatedCommodity?.commodityComplement ?? []
        ).at(-1)
        return h
          .view('commodities/identification/index', {
            pageTitle: 'Description of goods',
            referenceNumber,
            commodity: updatedCommodity,
            typeOfCommodity: updatedComplement?.typeOfCommodity,
            speciesLst: updatedComplement?.species ?? [],
            errorList: [{ text: SUBMISSION_FAILURE_MESSAGE }]
          })
          .code(statusCodes.internalServerError)
      }

      return h.redirect('/additional-details', { referenceNumber })
    }
  }
}
