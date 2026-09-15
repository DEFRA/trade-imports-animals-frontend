import {
  dashboardPath,
  hubRoutePath,
  pagePath
} from '../../../../../../shared/paths.js'
import { TEMPLATES } from '../../config.js'
import { rowEntry } from '../../../../../../flow/navigation.js'
import * as state from '../../../../../../engine/index.js'
import {
  FULFILLED,
  IN_PROGRESS,
  NA,
  NOT_STARTED,
  OPTIONAL
} from '../../../../../../bridge/status/index.js'
import { rowStatus, taskRowById } from '../../flow/task-rows.js'
import { notificationViewPage } from '../check-answers/page.js'
import { completeOpeningRun } from '../../../../../../flow/run-state.js'
import { journeyStrip, routeOptions } from '../../../../../../shared/kit.js'
import { copyFor } from '../../../../../../shared/copy.js'
import { copy as en } from './copy/copy.en.js'
import { copy as cy } from './copy/copy.cy.js'
import { copy as sharedEn } from '../../../../../../shared/copy.en.js'
import { copy as sharedCy } from '../../../../../../shared/copy.cy.js'

const view = `${TEMPLATES}/features/hub/template`

const copy = copyFor({ en, cy })
const sharedCopy = copyFor({ en: sharedEn, cy: sharedCy })

// Design release 1 divides the notification into six numbered sections under a
// "Notification tasklist" heading: the documents come fourth rather than after
// the addresses, and the consignment parties and the contact address are
// sections of their own rather than one shared "Addresses".
const GROUPS = [
  {
    id: 'about-the-consignment',
    rows: ['origin', 'commodities', 'importReason']
  },
  {
    id: 'description-of-the-goods',
    // Design release 1 opens this section with the commodity details, so the
    // consignment-details page leads the group rather than hanging off the
    // "What are you importing?" row in the section above. Identification
    // follows it and the additional details come last: the design points a
    // trader at identifying the animals before asking what they are certified
    // for, which is also the order the opening run visits the two pages in.
    rows: ['consignmentDetails', 'animalIdentification', 'additionalDetails']
  },
  {
    id: 'transport-and-arrival',
    rows: ['arrivalDetails', 'transitCountries', 'transporter']
  },
  { id: 'documents', rows: ['documents'] },
  { id: 'consignment-parties', rows: ['addresses'] },
  { id: 'contact-address', rows: ['contact'] }
]

const STATUS_TAG = {
  [FULFILLED]: {
    tag: { text: copy.statuses.completed, classes: 'govuk-tag--green' }
  },
  [OPTIONAL]: { text: copy.statuses.optional },
  [IN_PROGRESS]: {
    tag: { text: copy.statuses.inProgress, classes: 'govuk-tag--light-blue' }
  },
  [NOT_STARTED]: {
    tag: { text: copy.statuses.notYetStarted, classes: 'govuk-tag--blue' }
  }
}
const statusTag = (status) => STATUS_TAG[status] ?? STATUS_TAG[NOT_STARTED]

// Design release 1 ends the hub with a primary "Review and submit" button, not
// a task row: the review page is offered whatever else has been answered, so a
// trader can read back what the notification holds at any point. The page
// renders an unfinished notification, naming what is still outstanding, and the
// review section's own gate still stands between that page and submitting.
const reviewHref = (journeyId) => pagePath(journeyId, notificationViewPage.slug)

const isHiddenRow = (row, status) => row.conditional && status === NA

// Design release 1 lets a trader start any task on the notification in any
// order, so a row is a link and carries a real status whatever else has been
// answered. A row that does not apply to this consignment leaves the list
// (`isHiddenRow`) rather than sitting on it shut.
const rowItem = (base, row, scope, status, journeyId) => ({
  ...base,
  href: rowEntry(row, scope, journeyId),
  status: statusTag(status)
})

const buildRowItem = (id, answers, scope, evaluation, journeyId) => {
  const { title, hint } = copy.rows[id]
  const row = taskRowById(id)
  const status = rowStatus(row, answers, scope.inScope, evaluation)
  if (isHiddenRow(row, status)) {
    return null
  }
  // Design release 1 hints only the "Roles and addresses" row, so a row whose
  // copy carries no hint gets no hint slot at all rather than an empty one.
  const base = {
    title: { text: title },
    ...(hint ? { hint: { text: hint } } : {})
  }
  return rowItem(base, row, scope, status, journeyId)
}

const buildGroups = (answers, scope, evaluation, journeyId) =>
  GROUPS.map((group) => ({
    id: group.id,
    caption: copy.groups[group.id],
    items: group.rows
      .map((id) => buildRowItem(id, answers, scope, evaluation, journeyId))
      .filter(Boolean)
  }))

const toCount = (value) => {
  const count = Number((value ?? '').toString().trim())
  return Number.isFinite(count) ? count : 0
}

const sumOverLines = (lines, field) =>
  lines.reduce((total, { entry }) => total + toCount(entry[field]), 0)

// Design release 1 shows the summary on every visit to the hub, reading zero
// before any commodity line exists, so the totals are never absent.
const buildCommodityTotals = (answers, evaluation) => {
  const lines = state.collectionView(answers, ['commodityLines'], evaluation)
  return {
    animals: sumOverLines(lines, 'numberOfAnimalsQuantity'),
    packages: sumOverLines(lines, 'numberOfPackages')
  }
}

const handler = async (request, h) => {
  const { journeyId } = request.params
  await completeOpeningRun(request, h, journeyId)
  const { journey, answers, scope, evaluation } = await state.get(request, h)

  return h.view(view, {
    pageTitle: copy.title,
    heading: copy.title,
    copy,
    sharedCopy,
    journeyStrip: journeyStrip(journey),
    commodityTotals: buildCommodityTotals(answers, evaluation),
    groups: buildGroups(answers, scope, evaluation, journeyId),
    reviewHref: reviewHref(journeyId),
    dashboardHref: dashboardPath(),
    backLink: dashboardPath()
  })
}

export const routes = [
  { method: 'GET', path: hubRoutePath(), options: routeOptions, handler }
]
