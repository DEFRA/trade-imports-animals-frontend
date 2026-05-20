import { createLogger } from '../../common/helpers/logging/logger.js'
import {
  getSessionValue,
  setSessionValue
} from '../../common/helpers/session-helpers.js'
import { sessionKeys } from '../../common/constants/session-keys.js'
import { statusCodes } from '../../common/constants/status-codes.js'
import { SUBMISSION_FAILURE_MESSAGE } from '../../common/constants/messages.js'
import { getTotal, toObject } from '../../common/helpers/object-helpers.js'
import { saveNotification } from '../../common/helpers/notification-helpers.js'

const logger = createLogger()

export const commodityDetailsController = {
  get: {
    handler(_request, h) {
      logger.info(
        `Commodity: ${getSessionValue(_request, sessionKeys.commodity)} details page`
      )

      const referenceNumber = getSessionValue(
        _request,
        sessionKeys.referenceNumber
      )
      const commodity = getSessionValue(_request, sessionKeys.commodity)
      const commodityComplement = (commodity?.commodityComplement ?? []).at(-1)
      const speciesLst = commodityComplement?.species ?? []
      const typeOfCommodity = commodityComplement?.typeOfCommodity

      return h.view('commodities/details/index', {
        pageTitle: 'Description of goods',
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
        `Commodity: ${getSessionValue(_request, sessionKeys.commodity)} details page`
      )

      const commodity = getSessionValue(_request, sessionKeys.commodity)
      const referenceNumber = getSessionValue(
        _request,
        sessionKeys.referenceNumber
      )

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
          .view('commodities/details/index', {
            pageTitle: 'Description of goods',
            referenceNumber,
            commodity: updatedCommodity,
            typeOfCommodity: updatedComplement?.typeOfCommodity,
            speciesLst: updatedComplement?.species ?? [],
            totalNoOfAnimals: updatedComplement?.totalNoOfAnimals ?? 0,
            totalNoOfPackages: updatedComplement?.totalNoOfPackages ?? 0,
            errorList: [{ text: SUBMISSION_FAILURE_MESSAGE }]
          })
          .code(statusCodes.internalServerError)
      }

      return h.redirect('/commodities/identification', { referenceNumber })
    }
  }
}
