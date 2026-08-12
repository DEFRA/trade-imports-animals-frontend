import {
  createPath,
  dashboardPath,
  hubPath,
  pagePath,
  pageRoutePath
} from '../../../../../../shared/paths.js'
import { TEMPLATES } from '../../config.js'
import { DELETED } from '../../../../../../engine/index.js'
import {
  amendJourney,
  listKnownJourneys,
  startJourney
} from '../../../../../../engine/journey.js'
import { routeOptions, surfaceClass } from '../../../../../../shared/kit.js'
import { copyFor } from '../../../../../../shared/copy.js'
import { importTypeFilterPage } from '../import-type-filter/page.js'
import { copy as en } from './copy/copy.en.js'
import { copy as cy } from './copy/copy.cy.js'
import { copy as sharedEn } from '../../../../../../shared/copy.en.js'
import { copy as sharedCy } from '../../../../../../shared/copy.cy.js'
import {
  buildHomeListQueryString,
  buildPageResultsRangeLabel,
  buildPaginationLinks,
  normalizePageNumber,
  parseNotificationSort
} from './notification-helper.js'
import { toRow } from './view-model/row/index.js'
import { sortOptions } from './view-model/sort-options.js'

const view = `${TEMPLATES}/features/dashboard/template`

const copy = copyFor({ en, cy })
const sharedCopy = copyFor({ en: sharedEn, cy: sharedCy })

const parseReferenceNumber = (value) => {
  if (typeof value !== 'string') {
    return undefined
  }
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

export const renderDashboard = async (
  request,
  h,
  { recoverableError = false, retryCopy = null } = {}
) => {
  const queryPage = Number.parseInt(request.query?.page, 10)
  const requestedPage = normalizePageNumber(queryPage)
  const sort = parseNotificationSort(request.query?.sort)
  const referenceNumber = parseReferenceNumber(request.query?.referenceNumber)
  const listed = await listKnownJourneys(request, {
    page: requestedPage,
    sort,
    referenceNumber
  })
  const currentPage = normalizePageNumber(listed.page, listed.totalPages)
  const rows = listed.rows.filter((journey) => journey.status !== DELETED)
  const pagination = {
    page: currentPage,
    size: listed.size,
    totalElements: listed.totalElements,
    totalPages: listed.totalPages
  }

  return h.view(view, {
    pageTitle: copy.title,
    contentColumnClass: surfaceClass('display'),
    copy,
    sharedCopy,
    startAction: createPath(),
    listAction: dashboardPath(),
    notificationRows: rows.map((journey) => toRow(journey, retryCopy)),
    resultsLabel: buildPageResultsRangeLabel(
      pagination,
      rows.length,
      referenceNumber
        ? { ...copy.pagination.results, none: copy.search.noResults }
        : copy.pagination.results
    ),
    pagination: buildPaginationLinks(
      pagination,
      dashboardPath(),
      sort,
      copy.pagination,
      referenceNumber
    ),
    currentPage,
    sort,
    referenceNumber: referenceNumber ?? '',
    sortOptions,
    listQuerySuffix: buildHomeListQueryString({
      page: currentPage,
      sort,
      referenceNumber
    }),
    recoverableError,
    deletionSucceeded: request.query?.deleted === '1',
    copySucceeded: request.query?.copied === '1'
  })
}

const listGet = async (request, h) => renderDashboard(request, h)

const backToDashboard = (h) => h.redirect(dashboardPath())

const amendPost = async (request, h) => {
  const journey = await amendJourney(request, h, request.params.journeyId)
  return journey ? h.redirect(hubPath(journey.journeyId)) : backToDashboard(h)
}

export const routes = [
  {
    method: 'GET',
    path: dashboardPath(),
    options: routeOptions,
    handler: listGet
  },
  {
    method: 'POST',
    path: pageRoutePath('amend'),
    options: routeOptions,
    handler: amendPost
  },
  {
    method: 'POST',
    path: createPath(),
    options: routeOptions,
    handler: async (request, h) => {
      const journey = await startJourney(request, h)
      return h.redirect(pagePath(journey.journeyId, importTypeFilterPage.slug))
    }
  }
]
