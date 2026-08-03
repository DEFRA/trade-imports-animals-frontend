import { DELETED } from '../../../../../../engine/index.js'
import {
  listKnownJourneys,
  startJourney
} from '../../../../../../engine/journey.js'
import {
  HTTP_STATUS_BAD_REQUEST,
  HTTP_STATUS_INTERNAL_SERVER_ERROR
} from '../../../../../../lib/http-status.js'
import { copyFor } from '../../../../../../shared/copy.js'
import * as kit from '../../../../../../shared/kit.js'
import {
  createPath,
  createRoutePath,
  dashboardPath,
  dashboardRoutePath,
  pagePath
} from '../../../../../../shared/paths.js'
import {
  countryOptions,
  ukSubdivisionOptions
} from '../../../../services/reference/countries.js'
import { TEMPLATES } from '../../config.js'
import { importTypePage } from '../import-type/page.js'
import { copy as cy } from './copy/copy.cy.js'
import { copy as en } from './copy/copy.en.js'
import {
  applyArrivalRangeFilter,
  applyCountryFilter,
  applyStatusFilter,
  buildListQueryString,
  buildPageResultsRangeLabel,
  buildPaginationLinks,
  filterValues,
  normalizePageNumber,
  parseDateRangeQuery,
  parseNotificationSort,
  validateFilters
} from './notification-helper.js'
import { dashboardPage as page } from './page.js'
import { toRow } from './view-model/row/index.js'
import { sortOptions } from './view-model/sort-options.js'
import { statusFilterOptions } from './view-model/statuses.js'

export const meta = { ...page, collects: [] }

const view = `${TEMPLATES}/features/dashboard/template`
const copy = copyFor({ en, cy })

const parseReferenceNumber = (value) => {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

const countryGroups = () => [
  {
    label: copy.filters.country.groups.uk,
    items: ukSubdivisionOptions()
  },
  {
    label: copy.filters.country.groups.countries,
    items: countryOptions()
  }
]

const filterRows = (rows, values, dateRange) =>
  applyArrivalRangeFilter(
    applyCountryFilter(
      applyStatusFilter(rows, values.status),
      values.countryOfOrigin
    ),
    dateRange
  )

export const renderDashboard = async (
  request,
  h,
  { recoverableError = false } = {}
) => {
  const values = filterValues(request.query)
  const errors = validateFilters(request.query, copy.errors)
  const queryPage = Number.parseInt(request.query?.page, 10)
  const requestedPage = normalizePageNumber(queryPage)
  const sort = parseNotificationSort(request.query?.sort)
  const referenceNumber = errors?.referenceNumber
    ? undefined
    : parseReferenceNumber(values.referenceNumber)
  const listed = await listKnownJourneys(request, {
    page: requestedPage,
    sort,
    referenceNumber
  })
  const currentPage = normalizePageNumber(listed.page, listed.totalPages)
  const dateRange = parseDateRangeQuery(request.query)
  const rows = filterRows(
    listed.rows.filter((journey) => journey.status !== DELETED),
    values,
    dateRange
  )
  const paginationEnvelope = {
    page: currentPage,
    size: listed.size,
    totalElements: listed.totalElements,
    totalPages: listed.totalPages
  }
  const listQuery = {
    sort,
    referenceNumber,
    status: values.status,
    countryOfOrigin: values.countryOfOrigin,
    startDate: values.startDate,
    endDate: values.endDate
  }

  const response = h.view(view, {
    ...kit.base(copy.title, { recoverableError }),
    copy,
    startAction: createPath(),
    listAction: dashboardPath(),
    clearAction: dashboardPath(),
    notificationRows: rows.map(toRow),
    resultsLabel: buildPageResultsRangeLabel(
      paginationEnvelope,
      rows.length,
      copy.pagination.results
    ),
    pagination: buildPaginationLinks(
      paginationEnvelope,
      dashboardPath(),
      listQuery,
      copy.pagination
    ),
    currentPage,
    sort,
    sortOptions: sortOptions.map((option) => ({
      ...option,
      selected: option.value === sort
    })),
    values,
    errors: errors ?? {},
    errorSummary: kit.errorSummary(errors),
    statusOptions: statusFilterOptions(copy).map((option) => ({
      ...option,
      selected: option.value === values.status
    })),
    countryGroups: countryGroups(),
    listQuerySuffix: buildListQueryString({
      ...listQuery,
      page: currentPage
    })
  })

  return errors ? response.code(HTTP_STATUS_BAD_REQUEST) : response
}

const createNotification = async (request, h) => {
  const { failure, value: journey } = await kit.recoverableSave(
    () => startJourney(request, h),
    () =>
      renderDashboard(request, h, { recoverableError: true }).then((response) =>
        response.code(HTTP_STATUS_INTERNAL_SERVER_ERROR)
      )
  )
  return failure ?? h.redirect(pagePath(journey.journeyId, importTypePage.slug))
}

export const routes = [
  {
    method: 'GET',
    path: dashboardRoutePath(),
    options: kit.routeOptions,
    handler: renderDashboard
  },
  {
    method: 'POST',
    path: createRoutePath(),
    options: kit.routeOptions,
    handler: createNotification
  }
]
