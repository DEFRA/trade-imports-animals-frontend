import {
  dashboardPath,
  hubRoutePath,
  pagePath
} from '../../../../../../shared/paths.js'
import { TEMPLATES } from '../../config.js'
import { rowEntry } from '../../../../../../flow/navigation.js'
import * as state from '../../../../../../engine/index.js'
import { FULFILLED, NA } from '../../../../../../bridge/status/index.js'
import { rowStatus, taskRowById } from '../../flow/task-rows.js'
import { invalidRowIds } from '../../flow/stored-answers.js'
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

const GROUPS = [
  {
    id: 'about-the-consignment',
    rows: ['origin', 'commodities', 'importReason']
  },
  {
    id: 'description-of-the-goods',
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

const COMPLETE_TAG = {
  tag: { text: copy.statuses.complete, classes: 'govuk-tag--green' }
}
const TO_DO_TAG = {
  tag: { text: copy.statuses.toDo, classes: 'govuk-tag--blue' }
}

const statusTag = (status, invalid) =>
  status === FULFILLED && !invalid ? COMPLETE_TAG : TO_DO_TAG

const reviewHref = (journeyId) => pagePath(journeyId, notificationViewPage.slug)

const isHiddenRow = (row, status) => row.conditional && status === NA

const rowItem = (base, row, scope, status, journeyId, invalid) => ({
  ...base,
  href: rowEntry(row, scope, journeyId),
  status: statusTag(status, invalid)
})

const buildRowItem = (
  id,
  answers,
  scope,
  evaluation,
  journeyId,
  invalidRows
) => {
  const { title, hint } = copy.rows[id]
  const row = taskRowById(id)
  const status = rowStatus(row, answers, scope.inScope, evaluation)
  if (isHiddenRow(row, status)) {
    return null
  }
  const base = {
    title: { text: title },
    ...(hint ? { hint: { text: hint } } : {})
  }
  return rowItem(base, row, scope, status, journeyId, invalidRows.has(id))
}

const buildGroups = (answers, scope, evaluation, journeyId, invalidRows) =>
  GROUPS.map((group) => ({
    id: group.id,
    caption: copy.groups[group.id],
    items: group.rows
      .map((id) =>
        buildRowItem(id, answers, scope, evaluation, journeyId, invalidRows)
      )
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
  return {
    animals: sumOverLines(lines, 'numberOfAnimalsQuantity'),
    packages: sumOverLines(lines, 'numberOfPackages')
  }
}

const handler = async (request, h) => {
  const { journeyId } = request.params
  await completeOpeningRun(request, h, journeyId)
  const { journey, answers, storedAnswers, scope, evaluation } =
    await state.get(request, h)

  const invalidRows = await invalidRowIds(answers, { request, storedAnswers })

  return h.view(view, {
    pageTitle: copy.title,
    heading: copy.title,
    copy,
    sharedCopy,
    journeyStrip: journeyStrip(journey),
    commodityTotals: buildCommodityTotals(answers, evaluation),
    groups: buildGroups(answers, scope, evaluation, journeyId, invalidRows),
    reviewHref: reviewHref(journeyId),
    dashboardHref: dashboardPath()
  })
}

export const routes = [
  { method: 'GET', path: hubRoutePath(), options: routeOptions, handler }
]
