import { createLogger } from '../../common/helpers/logging/logger.js'
import {
  getSessionValue,
  setSessionValue
} from '../../common/helpers/session-helpers.js'
import { sessionKeys } from '../../common/constants/session-keys.js'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { statusCodes } from '../../common/constants/status-codes.js'
import { SUBMISSION_FAILURE_MESSAGE } from '../../common/constants/messages.js'
import { toObject } from '../../common/helpers/object-helpers.js'
import { saveNotification } from '../../common/helpers/notification-helpers.js'

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

function buildTypeItems(speciesDetails) {
  return [
    { value: '', text: 'Select type of commodity' },
    { text: '──────────', disabled: true },
    ...(speciesDetails?.data?.types ?? []).map((t) => ({
      value: t.text,
      text: t.text
    }))
  ]
}

function buildSpeciesItems(speciesDetails, selectedValues) {
  return (speciesDetails?.data?.species ?? []).map((s) => ({
    value: s.value,
    text: s.text,
    checked: selectedValues.includes(s.value)
  }))
}

export const commoditiesSelectController = {
  get: {
    handler(_request, h) {
      logger.info(
        `Commodity in session: ${getSessionValue(_request, sessionKeys.commodity)}`
      )

      const commodity = getSessionValue(_request, sessionKeys.commodity)
      const referenceNumber = getSessionValue(
        _request,
        sessionKeys.referenceNumber
      )
      const commodityComplement = (commodity?.commodityComplement ?? []).at(-1)
      const selectedSpecies = commodityComplement?.species ?? []
      const typeOfCommodity = commodityComplement?.typeOfCommodity

      const species = selectedSpecies
        .map((s) => (typeof s === 'string' ? s : s?.value))
        .filter(Boolean)

      const speciesDetails = toJsonObject(speciesDetailsList)

      return h.view('commodities/select/index', {
        pageTitle: 'Select species of commodity',
        referenceNumber,
        commodity,
        typeOfCommodity,
        species,
        commodityDetails: toJsonObject(commodityDetailsList),
        typeItems: buildTypeItems(speciesDetails),
        speciesItems: buildSpeciesItems(speciesDetails, species)
      })
    }
  },
  post: {
    async handler(_request, h) {
      logger.info(
        `Commodity in session: ${getSessionValue(_request, sessionKeys.commodity)}`
      )

      const referenceNumber = getSessionValue(
        _request,
        sessionKeys.referenceNumber
      )
      const commodity = getSessionValue(_request, sessionKeys.commodity)
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
      setSessionValue(_request, sessionKeys.commodity, commodityJson)

      try {
        // Submit notification - client will build complete notification from all session values
        await saveNotification(_request, logger)
      } catch (error) {
        const updatedCommodity = getSessionValue(
          _request,
          sessionKeys.commodity
        )
        const updatedComplement = (
          updatedCommodity?.commodityComplement ?? []
        ).at(-1)
        const updatedSpecies = (updatedComplement?.species ?? [])
          .map((s) => (typeof s === 'string' ? s : s?.value))
          .filter(Boolean)
        return h
          .view('commodities/select/index', {
            pageTitle: 'Select species of commodity',
            referenceNumber,
            commodity: updatedCommodity,
            typeOfCommodity: updatedComplement?.typeOfCommodity,
            species: updatedSpecies,
            commodityDetails: toJsonObject(commodityDetailsList),
            typeItems: buildTypeItems(speciesDetails),
            speciesItems: buildSpeciesItems(speciesDetails, updatedSpecies),
            errorList: [{ text: SUBMISSION_FAILURE_MESSAGE }]
          })
          .code(statusCodes.internalServerError)
      }

      return h.redirect('/import-reason', { referenceNumber })
    }
  }
}
