import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { FULFILLED, NOT_APPLICABLE } from '../flow-eval/index.js'
import { hubShape } from './config.js'
import { pagePath } from './paths.js'
import { groupStatusTag, pageStatusTag, tagged } from './status-tags.js'

/**
 * Graft 10 — the task-list hub view-model with per-section visibility:
 * three always-live task groups, add-on rows that appear on selection
 * and vanish while Not Applicable, and Get your quote always visible
 * but inert (no link) until the journey is Fulfilled — a documented
 * deviation from doc-default NA-hiding, kept for spike-a hub parity
 * (parity ruling c); the doc-default hide branch survives as
 * `quoteRowMode: 'na-hide'`, unit-tested only, never wired by a route.
 * Statuses come verbatim from the evaluation, copy from flow.json.
 */

const dirname = path.dirname(fileURLToPath(import.meta.url))
const flowPath = path.join(dirname, '..', 'model', 'flow.json')
let cachedFlow
const journeyFlow = () =>
  (cachedFlow ??= JSON.parse(fs.readFileSync(flowPath, 'utf8')))

const sectionById = (flow, sectionId) => {
  const section = flow.sections
    .flatMap((top) => [top, ...(top.children ?? [])])
    .find((child) => child.kind === 'group' && child.id === sectionId)
  if (!section) {
    throw new Error(`hubShape names unknown section "${sectionId}"`)
  }
  return section
}

const pagesOf = (section) =>
  (section.children ?? []).filter((child) => child.kind === 'page')

/** One always-live row per task group; NA pages drop out of the hint. */
const groupItem = (flow, evaluation, { sectionId }) => {
  const section = sectionById(flow, sectionId)
  const pages = pagesOf(section)
  const live = pages.filter(
    (page) => evaluation.containerStatuses.pages[page.id] !== NOT_APPLICABLE
  )
  return {
    title: { text: section.title },
    hint: { text: live.map((page) => page.title).join(', ') },
    href: pagePath(pages[0].slug),
    status: groupStatusTag(
      evaluation.containerStatuses.groups[section.id],
      flow.hub.statusLabels
    )
  }
}

const addonPickerItem = (flow, evaluation) => {
  const [picker] = pagesOf(sectionById(flow, hubShape.addons.sectionId))
  return {
    title: { text: picker.title },
    href: pagePath(picker.slug),
    status: pageStatusTag(
      evaluation.containerStatuses.pages[picker.id],
      flow.hub.statusLabels
    )
  }
}

/** One row per SELECTED add-on: hidden while Not Applicable. */
const addonItems = (flow, evaluation) =>
  hubShape.addons.addonSectionIds
    .map((sectionId) => ({
      section: sectionById(flow, sectionId),
      status: evaluation.containerStatuses.groups[sectionId]
    }))
    .filter(({ status }) => status !== NOT_APPLICABLE)
    .map(({ section, status }) => ({
      title: { text: section.title },
      hint: {
        text: pagesOf(section)
          .map((page) => page.title)
          .join(', ')
      },
      href: pagePath(pagesOf(section)[0].slug),
      status:
        status === FULFILLED
          ? { text: flow.hub.statusLabels.fulfilled }
          : tagged(flow.hub.statusLabels.incomplete, 'govuk-tag--blue')
    }))

/** Always visible, inert until Fulfilled — never a route guard. */
const quoteItem = (flow, evaluation) => {
  const [page] = pagesOf(sectionById(flow, hubShape.quote.sectionId))
  const ready = evaluation.journeyState === FULFILLED
  return {
    title: { text: flow.hub.quoteRowTitle },
    ...(ready && { href: pagePath(page.slug) }),
    status: ready
      ? tagged(flow.hub.statusLabels.notStarted, 'govuk-tag--blue')
      : {
          text: flow.hub.cannotStartYetText,
          classes: 'govuk-task-list__status--cannot-start-yet'
        }
  }
}

/**
 * hubViewModel(evaluation) -> the govukTaskList context. Progress counts
 * the three task groups only (spike-a parity) — add-ons and Get your
 * quote never move the completed-of-total line.
 */
export function hubViewModel(evaluation, options = {}) {
  const { flow = journeyFlow(), quoteRowMode = 'inert' } = options
  const items = hubShape.groups.map((group) =>
    groupItem(flow, evaluation, group)
  )
  items.push(addonPickerItem(flow, evaluation), ...addonItems(flow, evaluation))
  const groupStatuses = evaluation.containerStatuses.groups
  if (
    quoteRowMode !== 'na-hide' ||
    groupStatuses[hubShape.quote.sectionId] !== NOT_APPLICABLE
  ) {
    items.push(quoteItem(flow, evaluation))
  }
  const completedCount = hubShape.groups.filter(
    ({ sectionId }) => groupStatuses[sectionId] === FULFILLED
  ).length
  return {
    heading: flow.hub.heading,
    progressLine: flow.hub.progressLine
      .replace('{completed}', String(completedCount))
      .replace('{total}', String(hubShape.groups.length)),
    items,
    completedCount,
    totalCount: hubShape.groups.length
  }
}
