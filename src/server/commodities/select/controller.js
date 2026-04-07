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
import { toObject } from '../../common/helpers/object-helpers.js'

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
      const commodityComplement = (commodity?.commodityComplement ?? []).at(-1)
      const selectedSpecies = commodityComplement?.species ?? []
      const typeOfCommodity = commodityComplement?.typeOfCommodity

      const species = selectedSpecies
        .map((s) => (typeof s === 'string' ? s : s?.value))
        .filter(Boolean)
      const savedSpeciesValues = selectedSpecies.map((s) => s.value)

      return h.view('commodities/select/index', {
        pageTitle: 'Select species of commodity',
        heading: 'Commodity',
        referenceNumber,
        commodity,
        typeOfCommodity,
        species,
        savedSpeciesValues,
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
      const referenceNumber = getSessionValue(_request, 'referenceNumber')
      const commodity = getSessionValue(_request, 'commodity')
      const existingCommodityComplement = (
        commodity?.commodityComplement ?? []
      ).at(-1)
      const savedSpecies = existingCommodityComplement?.species ?? []
      const savedSpeciesByValue = new Map(savedSpecies.map((s) => [s.value, s]))

      const { typeOfCommodity, species } = _request.payload

      const speciesValues = Array.isArray(species)
        ? species
        : species
          ? [species]
          : []

      const speciesDetails = toJsonObject(speciesDetailsList)
      const speciesByValue = new Map(
        (speciesDetails?.data?.species ?? []).map((s) => [s.value, s.text])
      )
      let speciesLst = speciesValues.map((value) => ({
        value,
        text: speciesByValue.get(value) ?? value
      }))

      if (savedSpecies.length > 0) {
        speciesLst = speciesLst.map((s) => {
          const match = savedSpeciesByValue.get(s.value)
          if (!match) return s

          return {
            ...s,
            ...(match.noOfAnimals !== undefined
              ? { noOfAnimals: match.noOfAnimals }
              : {}),
            ...(match.noOfPackages !== undefined
              ? { noOfPackages: match.noOfPackages }
              : {})
          }
        })
      }

      const commodityComplement = {
        typeOfCommodity,
        species: speciesLst
      }

      const commodityJson = toObject(commodity, 'commodity')
      commodityJson.commodityComplement = [commodityComplement]
      setSessionValue(_request, 'commodity', commodityJson)

      try {
        // Submit notification - client will build complete notification from all session values
        await notificationClient.submit(_request, traceId)
        logger.info('Notification saved successfully')
      } catch (error) {
        logger.error(`Failed to submit notification: ${error.message}`)
      }

      return h.redirect('/import-reason', { referenceNumber })
    }
  }
}
