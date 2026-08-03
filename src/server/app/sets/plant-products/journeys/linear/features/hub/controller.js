// Minimum hub from docs/add-a-set.md step 9.
import {
  FULFILLED,
  IN_PROGRESS,
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
  { id: 'transport', rows: ['transport'] }
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

const CANNOT_START_STATUS = {
  text: copy.statuses.cannotStartYet,
  classes: 'govuk-task-list__status--cannot-start-yet'
}

const statusTag = (status) => STATUS_TAG[status] ?? STATUS_TAG[NOT_STARTED]

const reviewSection = () => sections.find(({ id }) => id === 'review')

const buildReviewItem = (answers, scope, evaluation, journeyId) => {
  const section = reviewSection()
  const base = {
    title: { text: copy.review.title },
    hint: { text: copy.review.hint }
  }
  if (section.pages.length === 0 || !sectionGatePasses(section, scope)) {
    return { ...base, status: CANNOT_START_STATUS }
  }
  return {
    ...base,
    href: sectionEntry(section.id, scope, journeyId),
    status: STATUS_TAG[
      sectionStatus(section, answers, scope.inScope, evaluation)
    ] ?? { tag: { text: copy.statuses.notYetStarted } }
  }
}

const buildRowItem = (id, answers, scope, evaluation, journeyId) => {
  const { title, hint } = copy.rows[id]
  const row = taskRowById(id)
  const status = rowStatus(row, answers, scope.inScope, evaluation)
  const base = {
    title: { text: title },
    ...(hint ? { hint: { text: hint } } : {})
  }
  return rowGatePasses(row, scope)
    ? {
        ...base,
        href: rowEntry(row, scope, journeyId),
        status: statusTag(status)
      }
    : { ...base, status: CANNOT_START_STATUS }
}

const buildGroups = (answers, scope, evaluation, journeyId) =>
  GROUPS.map((group) => ({
    id: group.id,
    caption: copy.groups[group.id],
    items: group.rows.map((id) =>
      buildRowItem(id, answers, scope, evaluation, journeyId)
    )
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
    reviewItems: [buildReviewItem(answers, scope, evaluation, journeyId)],
    dashboardHref: dashboardPath(),
    backLink: dashboardPath(),
    breadcrumbs: false
  })
}

export const routes = [
  { method: 'GET', path: hubRoutePath(), options: routeOptions, handler }
]
