import { createLogger } from '../../common/helpers/logging/logger.js'
import {
  getSessionValue,
  setSessionValue
} from '../../common/helpers/session-helpers.js'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { statusCodes } from '../../common/constants/status-codes.js'
import { toObject } from '../../common/helpers/object-helpers.js'
import { submitNotification } from '../../common/helpers/notification-helpers.js'
import { toCommodityDetails } from '../../common/helpers/commodity-helpers.js'

const logger = createLogger()
const dirname = path.dirname(fileURLToPath(import.meta.url))
const commodityDetailsPath = path.join(
  dirname,
  '../../common/mock-data/mock-commodity-details.json'
)
const speciesDetailsPath = path.join(dirname, 'mock-species.json')
const commodityDetailsList = JSON.parse(
  readFileSync(commodityDetailsPath, 'utf-8')
)
const speciesDetailsList = JSON.parse(readFileSync(speciesDetailsPath, 'utf-8'))
const commodityDetails = toCommodityDetails(commodityDetailsList)
const speciesDetails = toCommodityDetails(speciesDetailsList)

const VIEW_NAME = 'commodities/select/index'
const PAGE_TITLE = 'Select species of commodity'
const HEADING = 'Commodity'
const GENERIC_ERROR_MESSAGE =
  'Something went wrong, please contact the EUDP team'

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

      return h.view(VIEW_NAME, {
        pageTitle: PAGE_TITLE,
        heading: HEADING,
        referenceNumber,
        commodity,
        typeOfCommodity,
        species,
        savedSpeciesValues,
        commodityDetails,
        speciesDetails
      })
    }
  },
  post: {
    async handler(_request, h) {
      logger.info(
        `Commodity in session: ${getSessionValue(_request, 'commodity')}`
      )

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
              : {}),
            ...(match.earTag !== undefined ? { earTag: match.earTag } : {}),
            ...(match.passport !== undefined
              ? { passport: match.passport }
              : {})
          }
        })
      }

      const commodityComplement = {
        typeOfCommodity,
        species: speciesLst
      }

      const commodityJson = toObject(commodity, 'name')
      commodityJson.commodityComplement = [commodityComplement]
      setSessionValue(_request, 'commodity', commodityJson)

      try {
        await submitNotification(_request, logger)
      } catch (_error) {
        logger.warn(
          'submitNotification failed in commodity select POST; rendering error view'
        )
        return h
          .view(VIEW_NAME, {
            pageTitle: PAGE_TITLE,
            heading: HEADING,
            referenceNumber: getSessionValue(_request, 'referenceNumber'),
            commodity: commodityJson,
            typeOfCommodity: commodityComplement.typeOfCommodity,
            species: speciesValues,
            savedSpeciesValues: speciesValues,
            commodityDetails,
            speciesDetails,
            errorList: [{ text: GENERIC_ERROR_MESSAGE }]
          })
          .code(statusCodes.internalServerError)
      }

      return h.redirect('/import-reason')
    }
  }
}
