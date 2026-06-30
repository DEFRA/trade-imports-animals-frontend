import { createDraft, findQuote } from './lib/store.js'
import { addonByValue, addonHubItems } from './lib/addons.js'
import { contract } from './runtime/contract.js'

/**
 * Spike B — standalone, flattened. This file is the whole journey shell for the
 * one shape we ship (a task list whose tasks are short linear runs). There is no
 * generic variant builder and no shape registry: the groups are a literal below,
 * and navigation is spelled out directly over them. Everything the journey needs
 * — base path, layout, templates, the task groups, the start and hub pages — is
 * here, so you can read the journey end to end without leaving spike-b/.
 *
 * The model itself still lives in model/journey.json and is interpreted by
 * runtime/ (the `contract`); this file only drives routing/status/navigation.
 */

export const BASE = '/prototype-standalone/spike-b/task-list-with-linear-tasks'
export const LAYOUT = 'standalone/spike-b/templates/layout.njk'
const TEMPLATES = 'standalone/spike-b/templates'

// The journey shape, hardcoded: a hub of three tasks, each a short linear run of
// steps. (In the original this was one entry in a shared SHAPES registry.)
export const grouped = {
  kind: 'grouped',
  groups: [
    { title: 'Email', stepIds: ['email'] },
    {
      title: 'About you and your vehicle',
      stepIds: ['about-you', 'your-vehicle']
    },
    {
      title: 'Your driving and cover',
      stepIds: ['driving-history', 'claims', 'cover-type', 'optional-extras']
    }
  ]
}

export const hubPath = (id) => `${BASE}/${id}`
export const addonStepPath = (id, value, stepSlug) =>
  `${BASE}/${id}/addons/${value}/${stepSlug}`

export function breadcrumbs(quote, title) {
  return [
    { text: 'Prototypes', href: '/prototype-standalone' },
    { text: 'Spike B (standalone)', href: BASE },
    { text: 'Your application', href: hubPath(quote.id) },
    { text: title }
  ]
}

// Loops and the add-on fan-out own their own routes; everything else is a
// generic section page at {base}/{id}/{stepId}.
export function pathForStep(quote, stepId) {
  const kind = contract.stepKind(stepId)
  if (kind === 'loop') {
    return `${BASE}/${quote.id}/claims`
  }
  if (kind === 'subtasks') {
    return `${BASE}/${quote.id}/addons`
  }
  return `${BASE}/${quote.id}/${stepId}`
}

/** Turn a contract next/prev result (step id or { terminal }) into a URL. */
export function resolveNav(quote, result) {
  if (typeof result === 'string') {
    return pathForStep(quote, result)
  }
  switch (result.terminal) {
    case 'summary':
      return `${BASE}/${quote.id}/quote-summary`
    case 'hub':
      return hubPath(quote.id)
    case 'start':
    default:
      return BASE
  }
}

export const navBack = (id, stepId) => {
  const quote = findQuote(id)
  return resolveNav(quote, contract.prev(quote, stepId, grouped))
}

export const navNext = (id, stepId) => {
  const quote = findQuote(id)
  return resolveNav(quote, contract.next(quote, stepId, grouped))
}

// --- task-list status tags -------------------------------------------------

function statusTag(status) {
  if (status === 'complete') {
    return { text: 'Completed' }
  }
  if (status === 'cannot-start') {
    return {
      text: 'Cannot start yet',
      classes: 'govuk-task-list__status--cannot-start-yet'
    }
  }
  if (status === 'not-started') {
    return { tag: { text: 'Not started', classes: 'govuk-tag--blue' } }
  }
  return { tag: { text: 'Incomplete', classes: 'govuk-tag--blue' } }
}

function groupTag(statuses) {
  if (statuses.every((s) => s === 'complete')) {
    return { text: 'Completed' }
  }
  if (statuses.some((s) => s === 'complete' || s === 'partial')) {
    return { tag: { text: 'In progress', classes: 'govuk-tag--light-blue' } }
  }
  return { tag: { text: 'Not started', classes: 'govuk-tag--grey' } }
}

function getYourQuoteItem(quote) {
  const ready = contract.allComplete(quote)
  return {
    title: { text: 'Get your quote' },
    href: ready ? `${BASE}/${quote.id}/quote-summary` : undefined,
    status: ready
      ? { tag: { text: 'Not started', classes: 'govuk-tag--blue' } }
      : {
          text: 'Cannot start yet',
          classes: 'govuk-task-list__status--cannot-start-yet'
        }
  }
}

function hubViewModel(quote) {
  const live = contract.applicableSteps(quote)
  const items = grouped.groups.map((group) => {
    const liveIds = group.stepIds.filter((id) => live.includes(id))
    const statuses = liveIds.map((id) => contract.status(quote, id, grouped))
    return {
      title: { text: group.title },
      hint: { text: liveIds.map((id) => contract.stepTitle(id)).join(', ') },
      href: `${BASE}/${quote.id}/${group.stepIds[0]}`,
      status: groupTag(statuses)
    }
  })
  // Add-ons sit outside the groups: a selection task plus one task per chosen add-on.
  items.push({
    title: { text: contract.stepTitle('addons') },
    href: `${BASE}/${quote.id}/addons`,
    status: statusTag(contract.status(quote, 'addons', grouped))
  })
  items.push(...addonHubItems(quote, addonStepPath))
  items.push(getYourQuoteItem(quote))
  const completedCount = grouped.groups.filter((group) =>
    group.stepIds
      .filter((id) => live.includes(id))
      .every((id) => contract.status(quote, id, grouped) === 'complete')
  ).length
  return { items, completedCount, totalCount: grouped.groups.length }
}

/** The start page and the hub (task list) — the journey's two shell pages. */
export function shellRoutes() {
  const open = { auth: false }
  return [
    {
      method: 'GET',
      path: BASE,
      options: open,
      handler(_request, h) {
        return h.view(`${TEMPLATES}/start`, {
          pageTitle: 'Get a car insurance quote',
          startAction: `${BASE}/start`
        })
      }
    },
    {
      method: 'POST',
      path: `${BASE}/start`,
      options: open,
      handler(_request, h) {
        const draft = createDraft('spike-b')
        return h.redirect(hubPath(draft.id))
      }
    },
    {
      method: 'GET',
      path: `${BASE}/{id}`,
      options: open,
      handler(request, h) {
        const quote = findQuote(request.params.id)
        if (!quote) {
          return h.redirect(BASE)
        }
        return h.view(`${TEMPLATES}/hub`, {
          pageTitle: 'Get a car insurance quote',
          ...hubViewModel(quote),
          breadcrumbs: [
            { text: 'Prototypes', href: '/prototype-standalone' },
            { text: 'Spike B (standalone)', href: BASE },
            { text: 'Your application' }
          ]
        })
      }
    }
  ]
}

export { addonByValue }
