import { createLogger } from '../../common/helpers/logging/logger.js'
import {
  getSessionValue,
  setSessionValue
} from '../../common/helpers/session-helpers.js'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { notificationClient } from '../../common/clients/notification-client.js'
import { getTraceId } from '@defra/hapi-tracing'

const logger = createLogger()
const dirname = path.dirname(fileURLToPath(import.meta.url))
const commodityDetailsPath = path.join(dirname, 'mock-commodity-details.json')
const speciesDetailsPath = path.join(dirname, 'mock-species.json')
const commodityDetailsList = JSON.parse(
  readFileSync(commodityDetailsPath, 'utf-8')
)
const speciesDetailsList = JSON.parse(readFileSync(speciesDetailsPath, 'utf-8'))

function toJsonObject(detailsList) {
  if (Array.isArray(detailsList)) {
    if (detailsList.length === 0) {
      return null
    }

    return detailsList[0]
  }

  if (detailsList && typeof detailsList === 'object') {
    return detailsList
  }

  return null
}

export const commoditiesSelectController = {
  get: {
    handler(_request, h) {
      logger.info(
        `Commodity in session: ${getSessionValue(_request, 'commodity')}`
      )

      const commodity = getSessionValue(_request, 'commodity')
      const referenceNumber = getSessionValue(_request, 'referenceNumber')
      const typeOfCommodity = getSessionValue(_request, 'typeOfCommodity')
      const species = getSessionValue(_request, 'species') || []

      return h.view('commodities/select/index', {
        pageTitle: 'Select species of commodity',
        heading: 'Commodity',
        referenceNumber,
        commodity,
        typeOfCommodity,
        species,
        commodityDetails: toJsonObject(commodityDetailsList),
        speciesDetails: toJsonObject(speciesDetailsList)
      })
    }
  },
  post: {
    async handler(_request, h) {
      logger.info(
        `Commodity in session: ${getSessionValue(_request, 'commodity')}`
      )

      const traceId = getTraceId() ?? ''

      const commodity = getSessionValue(_request, 'commodity')
      const { typeOfCommodity, species } = _request.payload
      const referenceNumber = getSessionValue(_request, 'referenceNumber')

      const speciesLst = Array.isArray(species)
        ? species
        : species
          ? [species]
          : []

      setSessionValue(_request, 'typeOfCommodity', typeOfCommodity)
      setSessionValue(_request, 'species', speciesLst)

      const commodityComplement = {
        typeOfCommodity,
        species: speciesLst
      }

      const commodityJson =
        commodity && typeof commodity === 'object' ? commodity : { commodity }

      commodityJson.commodityComplement = [commodityComplement]
      setSessionValue(_request, 'commodity', commodityJson)

      try {
        // Submit notification - client will build complete notification from all session values
        await notificationClient.submit(_request, traceId)
        logger.info('Notification saved successfully')
      } catch (error) {
        logger.error(`Failed to submit notification: ${error.message}`)
      }

      return h.redirect('/commodities/select', { referenceNumber })
    }
  }
}
