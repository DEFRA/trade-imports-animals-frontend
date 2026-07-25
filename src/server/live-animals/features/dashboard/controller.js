import { randomUUID } from 'node:crypto'
import {
  createPath,
  dashboardPath,
  hubPath,
  pagePath,
  pageRoutePath,
  TEMPLATES
} from '../../config.js'
import { AMEND, DELETED, DRAFT, SUBMITTED } from '../../engine/index.js'
import {
  amendJourney,
  listKnownJourneys,
  startJourney
} from '../../engine/journey.js'
import { CYA_SLUG, journeyStrip, routeOptions } from '../../shared/kit.js'
import { copyFor } from '../../shared/copy.js'
import * as commodities from '../../services/commodities/index.js'
import * as countries from '../../services/countries/index.js'
import { importTypeFilterPage } from '../import-type-filter/page.js'
import { copy as en } from './copy.en.js'
import { copy as cy } from './copy.cy.js'
import { copy as sharedEn } from '../../shared/copy.en.js'
import { copy as sharedCy } from '../../shared/copy.cy.js'
import {
  buildHomeListQueryString,
  buildPageResultsRangeLabel,
  buildPaginationLinks,
  formatCommodity,
  formatDisplayDate,
  normalizePageNumber,
  NOTIFICATION_SORT_OPTIONS,
  parseNotificationSort
} from './notification-helper.js'

const view = `${TEMPLATES}/features/dashboard/template`

const copy = copyFor({ en, cy })
const sharedCopy = copyFor({ en: sharedEn, cy: sharedCy })

const sortOptionText = [
  copy.sort.options.arrivalNewest,
  copy.sort.options.arrivalOldest,
  copy.sort.options.createdNewest,
  copy.sort.options.createdOldest
]

const sortOptions = NOTIFICATION_SORT_OPTIONS.map((option, index) => ({
  ...option,
  text: sortOptionText[index]
}))

const rowActions = (journey) => {
  const copyAction = {
    text: sharedCopy.notificationActions.copy.text,
    postAction: pagePath(journey.journeyId, 'copy'),
    idempotencyKey: randomUUID(),
    copyOrigin: 'dashboard'
  }
  const deleteAction = {
    text: sharedCopy.notificationActions.delete.text,
    href: pagePath(journey.journeyId, 'delete')
  }
  if (journey.status === SUBMITTED) {
    return [
      {
        text: copy.actions.view,
        href: pagePath(journey.journeyId, CYA_SLUG)
      },
      {
        text: copy.actions.amend,
        postAction: pagePath(journey.journeyId, 'amend')
      },
      copyAction,
      deleteAction
    ]
  }
  if (journey.status === DRAFT) {
    return [
      {
        text: copy.actions.resume,
        href: hubPath(journey.journeyId)
      },
      copyAction,
      deleteAction
    ]
  }
  if (journey.status === AMEND) {
    return [
      {
        text: copy.actions.resume,
        href: hubPath(journey.journeyId)
      },
      copyAction,
      {
        text: copy.actions.cancelAmend,
        href: pagePath(journey.journeyId, 'cancel-amend')
      },
      deleteAction
    ]
  }
  return []
}

const toRow = (journey, retryCopy = null) => ({
  reference: journey.reference ?? journey.journeyId,
  status: journeyStrip(journey).status,
  commodity: formatCommodity(journey.commodity, commodities.commodityNameFor),
  origin: journey.originCountryCode
    ? (countries.originLabel(journey.originCountryCode) ??
      journey.originCountryCode)
    : '',
  arrival: formatDisplayDate(journey.arrivalDate),
  consignor: journey.consignorName ?? '',
  consignee: journey.consigneeName ?? '',
  created: formatDisplayDate(journey.createdAt),
  submitted: formatDisplayDate(journey.submittedAt),
  actions: rowActions(journey).map((action) =>
    retryCopy?.journeyId === journey.journeyId &&
    action.idempotencyKey !== undefined
      ? { ...action, idempotencyKey: retryCopy.idempotencyKey }
      : action
  )
})

export const renderDashboard = async (
  request,
  h,
  { recoverableError = false, retryCopy = null } = {}
) => {
  const queryPage = Number.parseInt(request.query?.page, 10)
  const requestedPage = normalizePageNumber(queryPage)
  const sort = parseNotificationSort(request.query?.sort)
  const listed = await listKnownJourneys(request, {
    page: requestedPage,
    sort
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
    copy,
    sharedCopy,
    startAction: createPath(),
    listAction: dashboardPath(),
    notificationRows: rows.map((journey) => toRow(journey, retryCopy)),
    resultsLabel: buildPageResultsRangeLabel(
      pagination,
      rows.length,
      copy.pagination.results
    ),
    pagination: buildPaginationLinks(
      pagination,
      dashboardPath(),
      sort,
      copy.pagination
    ),
    currentPage,
    sort,
    sortOptions,
    listQuerySuffix: buildHomeListQueryString({
      page: currentPage,
      sort
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
