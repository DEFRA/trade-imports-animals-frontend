import { BASE, hubRoutePath, TEMPLATES } from '../../config.js'
import { sections } from '../../flow/flow.js'
import { rowEntry, rowGatePasses, sectionEntry } from '../../flow/navigation.js'
import { sectionGatePasses } from '../../flow/gates.js'
import * as state from '../../engine/index.js'
import {
  FULFILLED,
  IN_PROGRESS,
  NA,
  NOT_STARTED,
  OPTIONAL
} from '../../bridge/status.js'
import { sectionStatus } from '../../flow/section-status.js'
import { rowStatus, taskRowById } from '../../flow/task-rows.js'
import { completeOpeningRun } from '../../flow/run-state.js'
import { dashboardPage } from '../dashboard/page.js'
import { journeyStrip, open } from '../../shared/kit.js'
import { copyFor } from '../../shared/copy.js'
import { copy as en } from './copy.en.js'
import { copy as cy } from './copy.cy.js'
import { copy as sharedEn } from '../../shared/copy.en.js'
import { copy as sharedCy } from '../../shared/copy.cy.js'

const view = `${TEMPLATES}/features/hub/template`

const copy = copyFor({ en, cy })
const sharedCopy = copyFor({ en: sharedEn, cy: sharedCy })

const GROUPS = [
  {
    id: 'about-the-consignment',
    rows: ['origin', 'commodities', 'importReason', 'exitDetails']
  },
  {
    id: 'commodity-details',
    rows: ['additionalDetails', 'animalIdentification']
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

const blockedRowItem = (base) => ({ ...base, status: CANNOT_START_STATUS })

const openRowItem = (base, row, scope, status, journeyId) => ({
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
  if (isHiddenRow(row, status)) return null
  const base = { title: { text: title }, hint: { text: hint } }
  return rowGatePasses(row, scope)
    ? openRowItem(base, row, scope, status, journeyId)
    : blockedRowItem(base)
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

const buildCommodityTotals = (answers, evaluation) => {
  const lines = state.collectionView(answers, ['commodityLines'], evaluation)
  if (lines.length === 0) return null
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
    dashboardHref: `${BASE}/${dashboardPage.slug}`,
    backLink: `${BASE}/${dashboardPage.slug}`,
    breadcrumbs: false
  })
}

export const routes = [
  { method: 'GET', path: hubRoutePath(), options: open, handler }
]
