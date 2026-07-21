import { hubPath, pagePath, TEMPLATES } from '../../config.js'
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

const buildReviewItem = ({ title, hint }, answers, scope) => {
  const section = reviewSection()
  const base = { title: { text: title }, hint: { text: hint } }
  if (!sectionGatePasses(section, scope)) {
    return { ...base, status: CANNOT_START_STATUS }
  }
  return {
    ...base,
    href: sectionEntry('review', scope),
    status: statusTag(sectionStatus(section, answers, scope.inScope))
  }
}

const buildRowItem = (id, answers, scope) => {
  const { title, hint } = copy.rows[id]
  if (id === 'review') return buildReviewItem({ title, hint }, answers, scope)
  const row = taskRowById(id)
  const status = rowStatus(row, answers, scope.inScope)
  if (row.conditional && status === NA) return null
  const base = { title: { text: title }, hint: { text: hint } }
  if (!rowGatePasses(row, scope)) {
    return { ...base, status: CANNOT_START_STATUS }
  }
  return { ...base, href: rowEntry(row, scope), status: statusTag(status) }
}

const buildGroups = (answers, scope) =>
  GROUPS.map((group) => ({
    id: group.id,
    caption: copy.groups[group.id],
    items: group.rows
      .map((id) => buildRowItem(id, answers, scope))
      .filter(Boolean)
  }))

const toCount = (value) => {
  const count = Number((value ?? '').toString().trim())
  return Number.isFinite(count) ? count : 0
}

const sumOverLines = (lines, field) =>
  lines.reduce((total, { entry }) => total + toCount(entry[field]), 0)

const buildCommodityTotals = (answers) => {
  const lines = state.collectionView(answers, ['commodityLines'])
  if (lines.length === 0) return null
  return {
    animals: sumOverLines(lines, 'numberOfAnimalsQuantity'),
    packages: sumOverLines(lines, 'numberOfPackages')
  }
}

const handler = async (request, h) => {
  await completeOpeningRun(request, h)
  const { journey, answers, scope } = await state.get(request, h)

  return h.view(view, {
    pageTitle: copy.title,
    heading: copy.title,
    copy,
    sharedCopy,
    journeyStrip: journeyStrip(journey),
    commodityTotals: buildCommodityTotals(answers),
    groups: buildGroups(answers, scope),
    dashboardHref: pagePath(dashboardPage.slug),
    backLink: pagePath(dashboardPage.slug),
    breadcrumbs: false
  })
}

export const routes = [
  { method: 'GET', path: hubPath(), options: open, handler }
]
