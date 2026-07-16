import { getTraceId } from '@defra/hapi-tracing'
import {
  operatorsClient,
  fromApiOperator
} from '../../common/clients/operators-client.js'
import { statusCodes } from '../../common/constants/status-codes.js'
import { operatorTypeLabel } from '../constants/operator-types.js'

const VIEW = 'address-book/view/index'
const BASE_PATH = '/address-book'

const TRANSPORTER_CATEGORY_LABELS = {
  PRIVATE: 'Private',
  COMMERCIAL: 'Commercial'
}

function getIdentity(request) {
  const profile = request.auth?.credentials ?? {}
  return { crn: profile.crn, organisationId: profile.organisationId }
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

function buildAddress(operator) {
  return [
    operator.addressLine1,
    operator.addressLine2,
    operator.city,
    operator.county,
    operator.postcode
  ]
    .filter(Boolean)
    .join(', ')
}

function buildRows(operator) {
  const rows = [
    { key: 'Name', value: operator.name },
    { key: 'Type', value: operatorTypeLabel(operator.operatorType) },
    { key: 'Address', value: buildAddress(operator) },
    { key: 'Country', value: operator.country },
    { key: 'Telephone', value: operator.telephone },
    { key: 'Email address', value: operator.email }
  ]

  if (operator.operatorType === 'TRANSPORTER') {
    if (operator.approvalNumber) {
      rows.push({ key: 'Approval number', value: operator.approvalNumber })
    }
    if (operator.transporterCategory) {
      rows.push({
        key: 'Transporter category',
        value:
          TRANSPORTER_CATEGORY_LABELS[operator.transporterCategory] ??
          operator.transporterCategory
      })
    }
  }

  return rows
}

/**
 * View-an-operator page — GET /address-book/{operatorId}.
 */
export const viewOperatorController = {
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

      return h.view(VIEW, {
        pageTitle: operator.name,
        heading: operator.name,
        rows: buildRows(operator),
        editHref: `${BASE_PATH}/${operatorId}/edit`,
        deleteHref: `${BASE_PATH}/${operatorId}/delete`
      })
    }
  }
}
