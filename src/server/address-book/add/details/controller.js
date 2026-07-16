import { getTraceId } from '@defra/hapi-tracing'
import { operatorsClient } from '../../../common/clients/operators-client.js'
import { setSessionValue } from '../../../common/helpers/session-helpers.js'
import { sessionKeys } from '../../../common/constants/session-keys.js'
import { formatValidationErrors } from '../../../common/helpers/validation-helpers.js'
import { statusCodes } from '../../../common/constants/status-codes.js'
import { OPERATOR_TYPES } from '../../constants/operator-types.js'
import { buildOperatorSchema } from '../../operator-schema.js'
import { getOperatorFormCountries } from '../../operator-countries.js'

const PAGE_TITLE = 'Add address details'
const VIEW = 'address-book/add/details/index'
const TYPE_PATH = '/address-book/add'
const LIST_PATH = '/address-book'

const validTypes = new Set(OPERATOR_TYPES.map(({ value }) => value))

function getIdentity(request) {
  const profile = request.auth?.credentials ?? {}
  return { crn: profile.crn, organisationId: profile.organisationId }
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

function buildViewModel(operatorType, countries, values, errors) {
  return {
    pageTitle: PAGE_TITLE,
    heading: PAGE_TITLE,
    operatorType,
    isTransporter: operatorType === 'TRANSPORTER',
    countryItems: buildCountryItems(countries, values.country),
    values,
    errorList: errors?.errorList,
    fieldErrors: errors?.fieldErrors
  }
}

/**
 * Add-an-operator address-details page — GET+POST /address-book/add/details.
 */
export const addOperatorDetailsController = {
  get: {
    async handler(request, h) {
      const operatorType = request.query?.operator_type

      if (!validTypes.has(operatorType)) {
        return h.redirect(TYPE_PATH)
      }

      const traceId = getTraceId() ?? ''
      const countries = await getOperatorFormCountries(traceId)

      return h.view(VIEW, buildViewModel(operatorType, countries, {}))
    }
  },
  post: {
    async handler(request, h) {
      const payload = request.payload ?? {}

      if (payload.action === 'cancel') {
        return h.redirect(LIST_PATH)
      }

      const operatorType = payload.operatorType
      const traceId = getTraceId() ?? ''
      const countries = await getOperatorFormCountries(traceId)
      const schema = buildOperatorSchema(countries.map(({ name }) => name))

      const { error, value } = schema.validate(payload, { abortEarly: false })

      if (error) {
        return h
          .view(
            VIEW,
            buildViewModel(
              operatorType,
              countries,
              payload,
              formatValidationErrors(error)
            )
          )
          .code(statusCodes.badRequest)
      }

      const identity = getIdentity(request)
      await operatorsClient.createOperator(traceId, identity, value)

      setSessionValue(
        request,
        sessionKeys.addressBookBanner,
        `${value.name} operator added`
      )

      return h.redirect(LIST_PATH)
    }
  }
}
