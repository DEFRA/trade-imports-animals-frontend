import { dashboardPath, hubRoutePath } from '../../../../../../shared/paths.js'
import { TEMPLATES } from '../../config.js'
import { sections } from '../../flow/flow.js'
import { rowEntry, sectionEntry } from '../../../../../../flow/navigation.js'
import { sectionGatePasses } from '../../../../../../flow/gates.js'
import * as state from '../../../../../../engine/index.js'
import {
  FULFILLED,
  IN_PROGRESS,
  NA,
  NOT_STARTED,
  OPTIONAL
} from '../../../../../../bridge/status/index.js'
import { sectionStatus } from '../../../../../../flow/section-status.js'
import { rowStatus, taskRowById } from '../../flow/task-rows.js'
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

const GROUPS = [
  {
    id: 'about-the-consignment',
    rows: ['origin', 'commodities', 'importReason']
  },
  {
    id: 'commodity-details',
    // Design release 1 opens this section with the commodity details, so the
    // consignment-details page leads the group rather than hanging off the
    // "What are you importing?" row in the section above.
    rows: ['consignmentDetails', 'additionalDetails', 'animalIdentification']
  },
  {
    id: 'movement',
    rows: ['arrivalDetails', 'transitCountries', 'transporter']
  },
  { id: 'addresses', rows: ['addresses', 'contact'] },
  { id: 'documents', rows: ['documents'] },
  { id: 'check-and-submit', rows: ['review'] }
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

// The one task the hub still shuts is Check and submit, which holds its own
// authored gate on submit-readiness. Every other row is a link from the moment
// the notification exists, so no answer row reads this status.
const CANNOT_START_STATUS = {
  text: copy.statuses.cannotStartYet,
  classes: 'govuk-task-list__status--cannot-start-yet'
}

const reviewSection = () => sections.find((section) => section.id === 'review')

const buildReviewItem = (
  { title, hint },
  answers,
  scope,
  evaluation,
  journeyId
) => {
  const section = reviewSection()
  const base = { title: { text: title }, hint: { text: hint } }
  if (!sectionGatePasses(section, scope)) {
    return { ...base, status: CANNOT_START_STATUS }
  }
  return {
    ...base,
    href: sectionEntry('review', scope, journeyId),
    status: statusTag(
      sectionStatus(section, answers, scope.inScope, evaluation)
    )
  }
}

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
  if (id === 'review') {
    return buildReviewItem(
      { title, hint },
      answers,
      scope,
      evaluation,
      journeyId
    )
  }
  const row = taskRowById(id)
  const status = rowStatus(row, answers, scope.inScope, evaluation)
  if (isHiddenRow(row, status)) {
    return null
  }
  const base = { title: { text: title }, hint: { text: hint } }
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
    dashboardHref: dashboardPath(),
    backLink: dashboardPath()
  })
}

export const routes = [
  { method: 'GET', path: hubRoutePath(), options: routeOptions, handler }
]
