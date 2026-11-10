import {
  dashboardPath,
  hubRoutePath,
  pagePath
} from '../../../../../../shared/paths.js'
import { TEMPLATES } from '../../config.js'
import {
  rowEntry,
  taskRowsOfSection
} from '../../../../../../flow/navigation.js'
import { journeySections } from '../../../../../../flow/journey-flow.js'
import { pageGatePasses } from '../../../../../../flow/gates.js'
import * as state from '../../../../../../engine/index.js'
import { FULFILLED, NA } from '../../../../../../bridge/status/index.js'
import { rowStatus } from '../../flow/task-rows.js'
import { invalidRowIds } from '../../flow/stored-answers.js'
import { notificationViewPage } from '../check-answers/page.js'
import {
  journeyStrip,
  routeOptions,
  TRAIL_START,
  withTrail
} from '../../../../../../shared/kit.js'
import { copyFor } from '../../../../../../shared/copy.js'
import { copy as en } from './copy/copy.en.js'
import { copy as cy } from './copy/copy.cy.js'
import { copy as sharedEn } from '../../../../../../shared/copy.en.js'
import { copy as sharedCy } from '../../../../../../shared/copy.cy.js'

const view = `${TEMPLATES}/features/hub/template`

const copy = copyFor({ en, cy })
const sharedCopy = copyFor({ en: sharedEn, cy: sharedCy })

const COMPLETE_TAG = {
  tag: { text: copy.statuses.complete, classes: 'govuk-tag--green' }
}
const TO_DO_TAG = {
  tag: { text: copy.statuses.toDo, classes: 'govuk-tag--blue' }
}

const statusTag = (status, invalid) =>
  status === FULFILLED && !invalid ? COMPLETE_TAG : TO_DO_TAG

const fromOverview = (href) => withTrail(href, [TRAIL_START.overview])

const reviewHref = (journeyId) =>
  fromOverview(pagePath(journeyId, notificationViewPage.slug))

const somePageOpens = (row, scope) =>
  row.pages.some((page) => pageGatePasses(page, scope))

const isHiddenRow = (row, status, scope) =>
  row.conditional && (status === NA || !somePageOpens(row, scope))

const rowItem = (base, row, scope, status, journeyId, invalid) => ({
  ...base,
  href: fromOverview(rowEntry(row, scope, journeyId)),
  status: statusTag(status, invalid)
})

const buildRowItem = (
  row,
  answers,
  scope,
  evaluation,
  journeyId,
  invalidRows
) => {
  const { title, hint } = copy.rows[row.id]
  const status = rowStatus(row, answers, scope.inScope, evaluation)
  if (isHiddenRow(row, status, scope)) {
    return null
  }
  const base = {
    title: { text: title },
    ...(hint ? { hint: { text: hint } } : {})
  }
  return rowItem(base, row, scope, status, journeyId, invalidRows.has(row.id))
}

const buildGroups = (answers, scope, evaluation, journeyId, invalidRows) =>
  journeySections()
    .map((section) => ({ section, rows: taskRowsOfSection(section) }))
    .filter(({ rows }) => rows.length > 0)
    .map(({ section, rows }) => ({
      id: section.id,
      caption: copy.groups[section.id],
      items: rows
        .map((row) =>
          buildRowItem(row, answers, scope, evaluation, journeyId, invalidRows)
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
