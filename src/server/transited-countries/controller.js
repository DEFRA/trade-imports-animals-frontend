import { createLogger } from '../common/helpers/logging/logger.js'
import {
  getSessionValue,
  setSessionValue
} from '../common/helpers/session-helpers.js'
import { sessionKeys } from '../common/constants/session-keys.js'
import { formatValidationErrors } from '../common/helpers/validation-helpers.js'
import { statusCodes } from '../common/constants/status-codes.js'
import { SUBMISSION_FAILURE_MESSAGE } from '../common/constants/messages.js'
import { saveNotification } from '../common/helpers/notification-helpers.js'
import { countriesClient } from '../common/clients/countries-client.js'
import { getTraceId } from '@defra/hapi-tracing'
import { requiresTransitedCountries } from '../common/helpers/transport-routing.js'
import { buildTransitedCountriesSchema } from './transited-countries-schema.js'

const logger = createLogger()

const PAGE_TITLE = 'Which countries will the consignment travel through?'
const VIEW = 'transited-countries/index'
const TRANSPORTERS_PATH = '/transporters'
const TRANSITED_COUNTRIES_PATH = '/transited-countries'
const SELECT_COUNTRY_MESSAGE =
  'Select at least one country the consignment will travel through'

function normaliseCountryCodes(value) {
  if (!value) {
    return []
  }

  return Array.isArray(value) ? value : [value]
}

function getSearchQuery(request) {
  const fromQuery = request.query?.q
  const fromPayload = request.payload?.q
  const raw = fromPayload ?? fromQuery ?? ''

  return String(raw).trim()
}

function transitedCountriesRedirectPath(searchQuery) {
  if (!searchQuery) {
    return TRANSITED_COUNTRIES_PATH
  }

  return `${TRANSITED_COUNTRIES_PATH}?q=${encodeURIComponent(searchQuery)}`
}

function getSelectedCodes(request) {
  return getSessionValue(request, sessionKeys.transitedCountries) ?? []
}

function resolveCountryNames(codes, allCountries) {
  const countriesByCode = new Map(
    allCountries.map(({ code, name }) => [code, name])
  )

  return codes.map((code) => ({
    code,
    name: countriesByCode.get(code) ?? code
  }))
}

function buildCheckboxItems(availableCountries) {
  return availableCountries.map(({ code, name }) => ({
    value: code,
    text: name,
    attributes: {
      'data-country-option': '',
      'data-country-name': name.toLowerCase()
    }
  }))
}

function filterCountriesBySearch(countries, searchQuery) {
  if (!searchQuery) {
    return countries
  }

  const normalisedQuery = searchQuery.toLowerCase()

  return countries.filter(({ name }) =>
    name.toLowerCase().includes(normalisedQuery)
  )
}

async function buildViewModel(request, traceId, searchQuery = '') {
  const allCountries = await countriesClient.getCountries(traceId, [
    'GBNAG_SPS_EX'
  ])
  const selectedCodes = getSelectedCodes(request)
  const selectedCodeSet = new Set(selectedCodes)
  const selectedCountries = resolveCountryNames(selectedCodes, allCountries)
  const availableCountries = filterCountriesBySearch(
    allCountries.filter(({ code }) => !selectedCodeSet.has(code)),
    searchQuery
  )

  return {
    pageTitle: PAGE_TITLE,
    referenceNumber: getSessionValue(request, sessionKeys.referenceNumber),
    selectedCountries,
    checkboxItems: buildCheckboxItems(availableCountries),
    searchQuery,
    allCountries
  }
}

function mergeSelectedCodes(existingCodes, codesToAdd) {
  return [...new Set([...existingCodes, ...codesToAdd])]
}

function redirectIfTransitNotRequired(request, h) {
  const meansOfTransport = getSessionValue(
    request,
    sessionKeys.meansOfTransport
  )

  if (!requiresTransitedCountries(meansOfTransport)) {
    return h.redirect(TRANSPORTERS_PATH)
  }

  return null
}

function renderValidationError(h, viewModel, error) {
  const formattedErrors = formatValidationErrors(error)

  return h
    .view(VIEW, {
      ...viewModel,
      errorList: formattedErrors.errorList,
      fieldErrors: formattedErrors.fieldErrors
    })
    .code(statusCodes.badRequest)
}

function handleRemoveCountry(request, h, removeCountry, searchQuery) {
  const updatedCodes = getSelectedCodes(request).filter(
    (code) => code !== removeCountry
  )
  setSessionValue(
    request,
    sessionKeys.transitedCountries,
    updatedCodes.length ? updatedCodes : null
  )

  return h.redirect(transitedCountriesRedirectPath(searchQuery))
}

function storeMergedCodes(request, value) {
  const codesToAdd = normaliseCountryCodes(value.transitedCountries)
  const mergedCodes = mergeSelectedCodes(getSelectedCodes(request), codesToAdd)

  setSessionValue(
    request,
    sessionKeys.transitedCountries,
    mergedCodes.length ? mergedCodes : null
  )

  return mergedCodes
}

function renderEmptySelectionError(h, viewModel) {
  return h
    .view(VIEW, {
      ...viewModel,
      selectedCountries: [],
      errorList: [
        {
          text: SELECT_COUNTRY_MESSAGE,
          href: '#transited-country'
        }
      ],
      fieldErrors: {
        transitedCountries: { text: SELECT_COUNTRY_MESSAGE }
      }
    })
    .code(statusCodes.badRequest)
}

async function saveAndRedirect(request, h, traceId, searchQuery) {
  try {
    await saveNotification(request, logger)
  } catch {
    const refreshedViewModel = await buildViewModel(
      request,
      traceId,
      searchQuery
    )
    return h
      .view(VIEW, {
        ...refreshedViewModel,
        errorList: [{ text: SUBMISSION_FAILURE_MESSAGE }]
      })
      .code(statusCodes.internalServerError)
  }

  return h.redirect(TRANSPORTERS_PATH)
}

export const transitedCountriesController = {
  get: {
    async handler(_request, h) {
      const earlyRedirect = redirectIfTransitNotRequired(_request, h)
      if (earlyRedirect) {
        return earlyRedirect
      }

      const traceId = getTraceId() ?? ''
      const searchQuery = getSearchQuery(_request)
      const viewModel = await buildViewModel(_request, traceId, searchQuery)

      return h.view(VIEW, viewModel)
    }
  },
  post: {
    async handler(_request, h) {
      const earlyRedirect = redirectIfTransitNotRequired(_request, h)
      if (earlyRedirect) {
        return earlyRedirect
      }

      const traceId = getTraceId() ?? ''
      const searchQuery = getSearchQuery(_request)
      const viewModel = await buildViewModel(_request, traceId, searchQuery)
      const validCountryCodes = viewModel.allCountries.map(({ code }) => code)
      const schema = buildTransitedCountriesSchema(validCountryCodes)
      const { error, value } = schema.validate(_request.payload, {
        abortEarly: false
      })

      if (error) {
        return renderValidationError(h, viewModel, error)
      }

      if (value.removeCountry) {
        return handleRemoveCountry(
          _request,
          h,
          value.removeCountry,
          searchQuery
        )
      }

      const mergedCodes = storeMergedCodes(_request, value)

      if (value.action === 'add') {
        return h.redirect(transitedCountriesRedirectPath(searchQuery))
      }

      if (!mergedCodes.length) {
        return renderEmptySelectionError(h, viewModel)
      }

      return saveAndRedirect(_request, h, traceId, searchQuery)
    }
  },
  remove: {
    async handler(_request, h) {
      return transitedCountriesController.post.handler(_request, h)
    }
  }
}
