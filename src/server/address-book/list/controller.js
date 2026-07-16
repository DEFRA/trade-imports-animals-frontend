import { getTraceId } from '@defra/hapi-tracing'
import {
  operatorsClient,
  fromApiOperator
} from '../../common/clients/operators-client.js'
import { buildPaginationLinks } from '../../common/helpers/notification-helper.js'
import { getSessionValue } from '../../common/helpers/session-helpers.js'
import { sessionKeys } from '../../common/constants/session-keys.js'
import {
  OPERATOR_TYPES,
  operatorTypeLabel
} from '../constants/operator-types.js'

const PAGE_TITLE = 'Address book'
const VIEW = 'address-book/list/index'
const BASE_PATH = '/address-book'

function getIdentity(request) {
  // On cookie-authed requests the defra-id profile is spread onto credentials
  // itself (see auth/controller.js session cache), not nested under `.profile`.
  const profile = request.auth?.credentials ?? {}
  return { crn: profile.crn, organisationId: profile.organisationId }
}

function parsePage(rawPage) {
  const page = Number.parseInt(rawPage, 10)
  return Number.isNaN(page) || page < 1 ? 1 : page
}

/**
 * Build the address book list query string, preserving the search term and
 * type filter and omitting `page` when it is the first page (b-002).
 * @param {{q?: string, operatorType?: string, page?: number}} filters
 * @returns {string} the query string, including a leading `?`, or ''
 */
export function buildAddressBookListQueryString({
  q,
  operatorType,
  page
} = {}) {
  const params = new URLSearchParams()

  if (q) {
    params.set('q', q)
  }
  if (operatorType) {
    params.set('operator_type', operatorType)
  }
  if (page && page > 1) {
    params.set('page', String(page))
  }

  const query = params.toString()
  return query ? `?${query}` : ''
}

function buildAddressLine(operator) {
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

function mapOperatorRow(apiOperator) {
  const operator = fromApiOperator(apiOperator)
  return {
    name: operator.name,
    type: operatorTypeLabel(operator.operatorType),
    address: buildAddressLine(operator),
    country: operator.country,
    viewHref: `${BASE_PATH}/${operator.id}`
  }
}

function buildResultsLabel(page, pageSize, itemCount, totalItems) {
  if (totalItems === 0) {
    return 'Showing 0 of 0'
  }

  const start = (page - 1) * pageSize + 1
  const end = start + itemCount - 1
  return `Showing ${start}-${end} of ${totalItems}`
}

function buildOperatorTypeOptions(operatorType) {
  return [
    { value: '', text: 'All', selected: !operatorType },
    ...OPERATOR_TYPES.map(({ value, label }) => ({
      value,
      text: label,
      selected: value === operatorType
    }))
  ]
}

/**
 * Address book list page controller — GET /address-book.
 */
export const addressBookListController = {
  async handler(request, h) {
    const traceId = getTraceId() ?? ''
    const identity = getIdentity(request)
    const banner = getSessionValue(request, sessionKeys.addressBookBanner, true)
    const q = request.query.q ?? ''
    const operatorType = request.query.operator_type ?? ''
    const page = parsePage(request.query.page)

    const response = await operatorsClient.listOperators(traceId, identity, {
      q: q || undefined,
      operatorType: operatorType || undefined,
      page
    })

    const items = response.items ?? []
    const pageSize = response.page_size ?? items.length
    const currentPage = response.page ?? page
    const totalItems = response.total_items ?? 0
    const totalPages = response.total_pages ?? 1

    const pagination = buildPaginationLinks(
      { page: currentPage, totalPages },
      BASE_PATH,
      undefined,
      (targetPage) =>
        buildAddressBookListQueryString({ q, operatorType, page: targetPage })
    )

    return h.view(VIEW, {
      pageTitle: PAGE_TITLE,
      heading: PAGE_TITLE,
      banner,
      operators: items.map(mapOperatorRow),
      resultsLabel: buildResultsLabel(
        currentPage,
        pageSize,
        items.length,
        totalItems
      ),
      pagination,
      q,
      operatorType,
      operatorTypeOptions: buildOperatorTypeOptions(operatorType)
    })
  }
}
