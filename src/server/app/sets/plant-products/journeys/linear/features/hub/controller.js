import {
  FULFILLED,
  IN_PROGRESS,
  NA,
  NOT_STARTED,
  OPTIONAL
} from '../../../../../../bridge/status/index.js'
import * as state from '../../../../../../engine/index.js'
import { sectionGatePasses } from '../../../../../../flow/gates.js'
import {
  rowEntry,
  rowGatePasses,
  sectionEntry
} from '../../../../../../flow/navigation.js'
import { sectionStatus } from '../../../../../../flow/section-status.js'
import { completeOpeningRun } from '../../../../../../flow/run-state.js'
import { dashboardPath, hubRoutePath } from '../../../../../../shared/paths.js'
import { copyFor } from '../../../../../../shared/copy.js'
import { journeyStrip, routeOptions } from '../../../../../../shared/kit.js'
import { copy as sharedEn } from '../../../../../../shared/copy.en.js'
import { copy as sharedCy } from '../../../../../../shared/copy.cy.js'
import { TEMPLATES } from '../../config.js'
import { sections } from '../../flow/flow.js'
import { rowStatus, taskRowById } from '../../flow/task-rows.js'
import { copy as cy } from './copy/copy.cy.js'
import { copy as en } from './copy/copy.en.js'

export const GROUPS = [
  { id: 'origin', rows: ['origin'] },
  { id: 'purpose', rows: ['purpose'] },
  { id: 'commodities', rows: ['commodities'] },
  { id: 'additional-details', rows: ['additional-details'] },
  { id: 'transport', rows: ['transport'] },
  { id: 'goods-movement', rows: ['goods-movement'] },
  { id: 'contact', rows: ['contact'] },
  { id: 'nominated-contacts', rows: ['nominated-contacts'] },
  { id: 'documents', rows: ['documents'] },
  { id: 'traders', rows: ['traders'] },
  { id: 'review', rows: ['review'] }
]

const view = `${TEMPLATES}/features/hub/template`
const copy = copyFor({ en, cy })
const sharedCopy = copyFor({ en: sharedEn, cy: sharedCy })

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

const ROW_COPY_KEYS = {
  'goods-movement': 'goodsMovement',
  'nominated-contacts': 'nominatedContacts'
}

const rowCopyKey = (id) => ROW_COPY_KEYS[id] ?? id

const blockedRowItem = (base) => ({ ...base, status: CANNOT_START_STATUS })

const openRowItem = (base, row, scope, status, journeyId) => ({
  ...base,
  href: rowEntry(row, scope, journeyId),
  status: statusTag(status)
})

const buildRowItem = (id, answers, scope, evaluation, journeyId) => {
  const { title, hint } = copy.rows[rowCopyKey(id)]
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
    groups: buildGroups(answers, scope, evaluation, journeyId),
    dashboardHref: dashboardPath(),
    backLink: dashboardPath(),
    breadcrumbs: false
  })
}

export const routes = [
  { method: 'GET', path: hubRoutePath(), options: routeOptions, handler }
]
