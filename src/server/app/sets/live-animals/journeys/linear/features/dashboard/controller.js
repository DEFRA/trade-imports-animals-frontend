import {
  createPath,
  createRoutePath,
  dashboardPath,
  dashboardRoutePath,
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
  pageRouteOptions,
  routeOptions,
  sharedCopy,
  surfaceClass,
  TRAIL_START,
  withTrail
} from '../../../../../../shared/kit.js'
import { journeySectionCaption } from '../../../../../../flow/journey-flow.js'
import { copyFor } from '../../../../../../shared/copy.js'
import { dashboardPage } from './page.js'
import { originPage } from '../origin/page.js'
import { notificationViewPage } from '../check-answers/page.js'
import { notificationActionsPage } from '../notification-actions/page.js'
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

const organisationIdOf = (request) =>
  buildActor(request.auth?.credentials)?.organisationId

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
  if (!journey) {
    return h.redirect(`${dashboardPath()}?amendRefused=1`)
  }
  request.logger.info(
    {
      journeyId: journey.journeyId,
      organisationId: organisationIdOf(request)
    },
    'Amendment started, sent to the review page'
  )
  return h.redirect(
    withTrail(pagePath(journey.journeyId, notificationViewPage.slug), [
      TRAIL_START.dashboard
    ])
  )
}

const openNewNotification = async (request, h, { startPlace }) => {
  const journey = await startJourney(request, h)
  request.logger.info(
    {
      journeyId: journey.journeyId,
      startPlace,
      organisationId: organisationIdOf(request)
    },
    'New notification opened'
  )
  return h.redirect(
    withTrail(pagePath(journey.journeyId, originPage.slug), [startPlace])
  )
}

const createPost = async (request, h) =>
  openNewNotification(request, h, {
    startPlace: TRAIL_START.dashboard
  })

const startGet = async (request, h) =>
  (
    await openNewNotification(request, h, {
      startPlace: TRAIL_START.ins
    })
  ).header('Cache-Control', 'no-store')

export const routes = [
  {
    method: 'GET',
    path: dashboardRoutePath(),
    options: pageRouteOptions(dashboardPage),
    handler: listGet
  },
  {
    method: 'POST',
    path: pageRoutePath('amend'),
    options: pageRouteOptions(notificationActionsPage),
    handler: amendPost
  },
  {
    method: 'POST',
    path: createRoutePath(),
    options: pageRouteOptions(notificationActionsPage),
    handler: createPost
  },
  {
    method: 'GET',
    path: startRoutePath(),
    options: routeOptions,
    handler: startGet
  }
]
