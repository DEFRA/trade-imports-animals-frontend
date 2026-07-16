import { getTraceId } from '@defra/hapi-tracing'
import {
  operatorsClient,
  fromApiOperator
} from '../../common/clients/operators-client.js'
import { countriesClient } from '../../common/clients/countries-client.js'
import { setSessionValue } from '../../common/helpers/session-helpers.js'
import { sessionKeys } from '../../common/constants/session-keys.js'
import { formatValidationErrors } from '../../common/helpers/validation-helpers.js'
import { statusCodes } from '../../common/constants/status-codes.js'
import { buildOperatorSchema } from '../operator-schema.js'

const PAGE_TITLE = 'Edit address details'
const VIEW = 'address-book/edit/index'
const LIST_PATH = '/address-book'

function getIdentity(request) {
  const profile = request.auth?.credentials?.profile ?? {}
  return { crn: profile.crn, organisationId: profile.organisationId }
}

function formAction(operatorId) {
  return `${LIST_PATH}/${operatorId}/edit`
}

function renderNotFound(h) {
  return h
    .view('error/index', {
      pageTitle: 'Page not found',
      heading: statusCodes.notFound,
      message: 'Page not found'
    })
    .code(statusCodes.notFound)
}

async function getMdmCountries(traceId) {
  const countries = await countriesClient.getCountries(traceId)

  if (!Array.isArray(countries) || countries.length === 0) {
    throw new Error('Cannot render the operator form without a country list')
  }

  return countries
}

function buildCountryItems(countries, selectedCountry) {
  return [
    { value: '', text: 'Select a country' },
    ...countries.map(({ name }) => ({
      value: name,
      text: name,
      selected: name === selectedCountry
    }))
  ]
}

function buildViewModel(operatorId, operatorType, countries, values, errors) {
  return {
    pageTitle: PAGE_TITLE,
    heading: PAGE_TITLE,
    formAction: formAction(operatorId),
    operatorType,
    isTransporter: operatorType === 'TRANSPORTER',
    countryItems: buildCountryItems(countries, values.country),
    values,
    errorList: errors?.errorList,
    fieldErrors: errors?.fieldErrors
  }
}

/**
 * Edit-an-operator page — GET+POST /address-book/{operatorId}/edit.
 */
export const editOperatorController = {
  get: {
    async handler(request, h) {
      const { operatorId } = request.params
      const traceId = getTraceId() ?? ''
      const identity = getIdentity(request)

      let apiOperator
      try {
        apiOperator = await operatorsClient.getOperator(
          traceId,
          identity,
          operatorId
        )
      } catch (err) {
        if (err.status === statusCodes.notFound) {
          return renderNotFound(h)
        }
        throw err
      }

      const operator = fromApiOperator(apiOperator)
      const countries = await getMdmCountries(traceId)

      return h.view(
        VIEW,
        buildViewModel(operatorId, operator.operatorType, countries, operator)
      )
    }
  },
  post: {
    async handler(request, h) {
      const { operatorId } = request.params
      const payload = request.payload ?? {}

      if (payload.action === 'cancel') {
        return h.redirect(LIST_PATH)
      }

      const operatorType = payload.operatorType
      const traceId = getTraceId() ?? ''
      const countries = await getMdmCountries(traceId)
      const schema = buildOperatorSchema(countries.map(({ name }) => name))

      const { error, value } = schema.validate(payload, { abortEarly: false })

      if (error) {
        return h
          .view(
            VIEW,
            buildViewModel(
              operatorId,
              operatorType,
              countries,
              payload,
              formatValidationErrors(error)
            )
          )
          .code(statusCodes.badRequest)
      }

      const identity = getIdentity(request)
      await operatorsClient.updateOperator(traceId, identity, operatorId, value)

      setSessionValue(
        request,
        sessionKeys.addressBookBanner,
        `${value.name} operator updated`
      )

      return h.redirect(LIST_PATH)
    }
  }
}
