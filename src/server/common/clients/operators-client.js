import { config } from '../../../config/config.js'
import { createLogger } from '../helpers/logging/logger.js'

const tradeImportsOperatorsUrl = config.get('tradeImportsOperatorsApi.baseUrl')
const tracingHeader = config.get('tracing.header')
const crnHeader = 'Trade-Imports-Crn'
const organisationIdHeader = 'Trade-Imports-Organisation-Id'
const logger = createLogger()

const FIELD_MAP = [
  ['operatorType', 'operator_type'],
  ['name', 'name'],
  ['addressLine1', 'address_line_1'],
  ['addressLine2', 'address_line_2'],
  ['city', 'town'],
  ['county', 'county'],
  ['postcode', 'postcode'],
  ['country', 'country'],
  ['telephone', 'telephone'],
  ['email', 'email'],
  ['approvalNumber', 'approval_number'],
  ['transporterCategory', 'transporter_category']
]

const wireToForm = Object.fromEntries(
  FIELD_MAP.map(([form, wire]) => [wire, form])
)

/**
 * Map the camelCase form/session operator (town called `city`) onto the
 * snake_case wire body the operators API expects. Country is a display-name
 * string passed through untouched (c-004).
 * @param {object} operator - camelCase operator captured from the form
 * @returns {object} snake_case request body
 */
export function toApiOperator(operator) {
  const body = {}

  for (const [form, wire] of FIELD_MAP) {
    if (operator[form] !== undefined) {
      body[wire] = operator[form]
    }
  }

  return body
}

/**
 * Map a snake_case API operator (town called `town`) onto the camelCase
 * operator shape the address-book pages render (town called `city`).
 * Country passes through untouched (c-004).
 * @param {object} apiOperator - snake_case operator response
 * @returns {object} camelCase operator
 */
export function fromApiOperator(apiOperator) {
  const operator = { id: apiOperator.id }

  for (const [form, wire] of FIELD_MAP) {
    if (apiOperator[wire] !== undefined) {
      operator[form] = apiOperator[wire]
    }
  }

  operator.crn = apiOperator.crn
  operator.organisationId = apiOperator.organisation_id
  operator.status = apiOperator.status
  operator.createdAt = apiOperator.created_at
  operator.modifiedAt = apiOperator.modified_at

  return operator
}

/**
 * Map a snake_case API operator onto the embedded notification party copy:
 * camelCase with `city`, plus the `operatorId` reference stored alongside the
 * copy (c-002/c-003). Country passes through untouched (c-004).
 * @param {object} apiOperator - snake_case operator response
 * @returns {object} notification party shape
 */
export function toNotificationOperator(apiOperator) {
  return {
    operatorId: apiOperator.id,
    name: apiOperator.name,
    address: {
      addressLine1: apiOperator.address_line_1,
      addressLine2: apiOperator.address_line_2,
      city: apiOperator.town,
      county: apiOperator.county,
      postcode: apiOperator.postcode,
      country: apiOperator.country
    },
    telephone: apiOperator.telephone,
    email: apiOperator.email
  }
}

/**
 * Map a snake_case TRANSPORTER operator onto the notification transporter
 * party shape — the party copy plus `approvalNumber` and `type`.
 * @param {object} apiOperator - snake_case transporter response
 * @returns {object} notification transporter shape
 */
export function toTransporter(apiOperator) {
  return {
    ...toNotificationOperator(apiOperator),
    approvalNumber: apiOperator.approval_number,
    type: apiOperator.transporter_category
  }
}

function mapApiErrorsToFormErrors(errors) {
  const errorList = []
  const fieldErrors = {}

  for (const [wireField, messages] of Object.entries(errors)) {
    const formField = wireToForm[wireField] ?? wireField
    const [text] = messages

    errorList.push({ text, href: `#${formField}` })
    fieldErrors[formField] = { text }
  }

  return { errorList, fieldErrors }
}

async function readProblem(response) {
  try {
    return await response.json()
  } catch {
    return undefined
  }
}

async function throwOnError(response, message, { mapValidation = false } = {}) {
  if (response.ok) {
    return
  }

  if (mapValidation && response.status === 400) {
    const problem = await readProblem(response)

    if (problem?.errors) {
      const error = new Error(`${message}: validation failed`)
      error.status = 400
      error.validation = mapApiErrorsToFormErrors(problem.errors)
      logger.error(error.message)
      throw error
    }
  }

  const error = new Error(message)
  error.status = response.status
  error.statusText = response.statusText
  logger.error(`${message}: ${response.status}`)
  throw error
}

export const operatorsClient = {
  /**
   * List the caller's operators, optionally filtered by search term and type.
   * @param {string} traceId - request trace id
   * @param {{crn: string, organisationId: string}} identity - forwarded identity
   * @param {{q?: string, operatorType?: string, page?: number}} filters
   * @returns {Promise<object>} one page of operators
   */
  async listOperators(traceId, identity, { q, operatorType, page } = {}) {
    const url = new URL(`${tradeImportsOperatorsUrl}/operators`)

    if (q) {
      url.searchParams.append('q', q)
    }
    if (operatorType) {
      url.searchParams.append('operator_type', operatorType)
    }
    if (page) {
      url.searchParams.append('page', String(page))
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        [tracingHeader]: traceId,
        [crnHeader]: identity.crn
      }
    })

    await throwOnError(response, 'Failed to list operators')

    return response.json()
  },

  /**
   * Fetch a single operator by id, including tombstones.
   * @param {string} traceId - request trace id
   * @param {{crn: string, organisationId: string}} identity - forwarded identity
   * @param {string} operatorId - operator id
   * @returns {Promise<object>} the operator
   */
  async getOperator(traceId, identity, operatorId) {
    const response = await fetch(
      `${tradeImportsOperatorsUrl}/operators/${operatorId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          [tracingHeader]: traceId,
          [crnHeader]: identity.crn
        }
      }
    )

    await throwOnError(response, 'Failed to get operator')

    return response.json()
  },

  /**
   * Create an operator. Both identity headers are required by the service.
   * @param {string} traceId - request trace id
   * @param {{crn: string, organisationId: string}} identity - forwarded identity
   * @param {object} operator - camelCase operator from the form
   * @returns {Promise<object>} the created operator
   */
  async createOperator(traceId, identity, operator) {
    const response = await fetch(`${tradeImportsOperatorsUrl}/operators`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        [tracingHeader]: traceId,
        [crnHeader]: identity.crn,
        [organisationIdHeader]: identity.organisationId
      },
      body: JSON.stringify(toApiOperator(operator))
    })

    await throwOnError(response, 'Failed to create operator', {
      mapValidation: true
    })

    return response.json()
  },

  /**
   * Replace an operator's mutable fields.
   * @param {string} traceId - request trace id
   * @param {{crn: string, organisationId: string}} identity - forwarded identity
   * @param {string} operatorId - operator id
   * @param {object} operator - camelCase operator from the form
   * @returns {Promise<object>} the updated operator
   */
  async updateOperator(traceId, identity, operatorId, operator) {
    const response = await fetch(
      `${tradeImportsOperatorsUrl}/operators/${operatorId}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          [tracingHeader]: traceId,
          [crnHeader]: identity.crn
        },
        body: JSON.stringify(toApiOperator(operator))
      }
    )

    await throwOnError(response, 'Failed to update operator', {
      mapValidation: true
    })

    return response.json()
  },

  /**
   * Soft-delete an operator (idempotent tombstone).
   * @param {string} traceId - request trace id
   * @param {{crn: string, organisationId: string}} identity - forwarded identity
   * @param {string} operatorId - operator id
   * @returns {Promise<void>}
   */
  async deleteOperator(traceId, identity, operatorId) {
    const response = await fetch(
      `${tradeImportsOperatorsUrl}/operators/${operatorId}`,
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          [tracingHeader]: traceId,
          [crnHeader]: identity.crn
        }
      }
    )

    await throwOnError(response, 'Failed to delete operator')
  }
}
