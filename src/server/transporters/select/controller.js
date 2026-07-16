import { getTraceId } from '@defra/hapi-tracing'
import {
  operatorsClient,
  fromApiOperator
} from '../../common/clients/operators-client.js'
import { getSessionValue } from '../../common/helpers/session-helpers.js'
import { sessionKeys } from '../../common/constants/session-keys.js'
import { createLogger } from '../../common/helpers/logging/logger.js'
import { transporterCategoryLabel } from '../../address-book/constants/operator-types.js'

const logger = createLogger()

const PAGE_TITLE = 'Search for an existing transporter'
const VIEW = 'transporters/select/index'
const OPERATOR_TYPE = 'TRANSPORTER'

function getIdentity(request) {
  const profile = request.auth?.credentials ?? {}
  return { crn: profile.crn, organisationId: profile.organisationId }
}

function toRow(apiOperator) {
  const operator = fromApiOperator(apiOperator)
  return {
    id: operator.id,
    name: operator.name,
    addressLine1: operator.addressLine1,
    addressLine2: operator.addressLine2,
    city: operator.city,
    county: operator.county,
    postcode: operator.postcode,
    country: operator.country,
    approvalNumber: operator.approvalNumber,
    type: transporterCategoryLabel(operator.transporterCategory)
  }
}

export const transportersSelectController = {
  get: {
    async handler(request, h) {
      const referenceNumber = getSessionValue(
        request,
        sessionKeys.referenceNumber
      )
      logger.info(`Transporter: ${referenceNumber} selection page`)

      const traceId = getTraceId() ?? ''
      const response = await operatorsClient.listOperators(
        traceId,
        getIdentity(request),
        { operatorType: OPERATOR_TYPE }
      )
      const transporters = (response.items ?? []).map(toRow)

      return h.view(VIEW, {
        pageTitle: PAGE_TITLE,
        referenceNumber,
        transporters
      })
    }
  }
}
