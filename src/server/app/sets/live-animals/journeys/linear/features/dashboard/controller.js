import {
  createPath,
  createRoutePath,
  dashboardPath,
  dashboardRoutePath,
  hubPath,
  pagePath,
  pageRoutePath,
  startRoutePath
} from '../../../../../../shared/paths.js'
import { buildActor } from '../../../../../../../common/helpers/actor-helpers.js'
import { TEMPLATES } from '../../config.js'
import { DELETED } from '../../../../../../engine/index.js'
import {
  amendJourney,
  listKnownJourneys,
  startJourney
} from '../../../../../../engine/journey.js'
import {
  routeOptions,
  sharedCopy,
  surfaceClass
} from '../../../../../../shared/kit.js'
import { journeySectionCaption } from '../../../../../../flow/journey-flow.js'
import {
  beginOpeningRun,
  RUN_ENTRY_LIST_CREATE,
  RUN_ENTRY_START
} from '../../../../../../flow/run-state.js'
import { copyFor } from '../../../../../../shared/copy.js'
import { dashboardPage } from './page.js'
import { originPage } from '../origin/page.js'
import { copy as en } from './copy/copy.en.js'
import { copy as cy } from './copy/copy.cy.js'
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

const parseReferenceNumber = (value) => {
  if (typeof value !== 'string') {
    return undefined
  }
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

const successBannerFor = (query) => {
  if (query?.deleted !== '1') {
    return null
  }
  const { successTitle, successBody } = sharedCopy.notificationActions.delete
  return { titleText: successTitle, text: successBody }
}

export const renderDashboard = async (
  request,
  h,
  { recoverableError = false } = {}
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
    caption: journeySectionCaption(dashboardPage.id),
    contentColumnClass: surfaceClass('display'),
    copy,
    sharedCopy,
    startAction: createPath(),
    listAction: dashboardPath(),
    notificationRows: await Promise.all(rows.map(toRow)),
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
    successBanner: successBannerFor(request.query),
    amendRefused: request.query?.amendRefused === '1'
  })
}

const listGet = async (request, h) => renderDashboard(request, h)

const amendPost = async (request, h) => {
  const journey = await amendJourney(request, h, request.params.journeyId)
  return h.redirect(
    journey ? hubPath(journey.journeyId) : `${dashboardPath()}?amendRefused=1`
  )
}

const openNewNotification = async (request, h, { entry }) => {
  const journey = await startJourney(request, h)
  await beginOpeningRun(request, h, journey.journeyId, { entry })
  request.logger.info(
    {
      journeyId: journey.journeyId,
      entry,
      organisationId: buildActor(request.auth?.credentials)?.organisationId
    },
    'New notification opened'
  )
  return h.redirect(pagePath(journey.journeyId, originPage.slug))
}

const createPost = async (request, h) =>
  openNewNotification(request, h, { entry: RUN_ENTRY_LIST_CREATE })

const startGet = async (request, h) =>
  (await openNewNotification(request, h, { entry: RUN_ENTRY_START })).header(
    'Cache-Control',
    'no-store'
  )

export const routes = [
  {
    method: 'GET',
    path: dashboardRoutePath(),
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
    path: createRoutePath(),
    options: routeOptions,
    handler: createPost
  },
  {
    method: 'GET',
    path: startRoutePath(),
    options: routeOptions,
    handler: startGet
  }
]
