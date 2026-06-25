import { createDraft, findQuote } from '../../shared/store.js'
import { claimsRoutes } from '../../shared/claims-routes.js'
import { addonsRoutes } from '../../shared/addons-routes.js'
import {
  addonByValue,
  addonSequence,
  addonHubItems
} from '../../shared/addons.js'
import { modelSectionHandlers, modelSectionRoutes } from './controller.js'
import { spikeEndings } from './endings.js'
import { SHAPES, resolveNav } from './nav.js'

/**
 * Build one variant (a Hapi plugin) for a spike from its contract and a journey
 * shape. The three shapes reuse the existing variant chrome (layouts, start and
 * hub templates) so the only thing that varies across spikes is the contract.
 *
 * @param {object} cfg
 * @param {string} cfg.slug   spike slug, e.g. 'spike-a'
 * @param {'linear'|'hub'|'grouped'} cfg.shapeName
 * @param {object} cfg.contract the spike's runtime adapter (the common contract)
 */
export function buildVariant({ slug, shapeName, contract }) {
  const shape = SHAPES[shapeName]
  const chrome = CHROME[shapeName]
  const base = `${chrome.base(slug)}`
  const layout = chrome.layout
  const open = { auth: false }
  const hubPath = (id) => `${base}/${id}`

  const breadcrumbs =
    shapeName === 'linear'
      ? undefined
      : (quote, title) => [
          { text: 'Prototypes', href: '/prototype' },
          { text: chrome.serviceName, href: base },
          { text: 'Your application', href: hubPath(quote.id) },
          { text: title }
        ]

  const makeHandlers = modelSectionHandlers({
    contract,
    base,
    layout,
    shape,
    breadcrumbs
  })

  const addonStepPath = (id, value, stepSlug) =>
    `${base}/${id}/addons/${value}/${stepSlug}`

  const startAndHub = buildStartAndHub()

  const routes = [
    ...startAndHub,
    ...modelSectionRoutes({ contract, base, makeHandlers }),
    ...claimsRoutes({
      basePath: base,
      layout,
      claimsBack: (id) => navBack(contract, base, id, 'claims', shape),
      afterClaims: (id) => navNext(contract, base, id, 'claims', shape),
      breadcrumbs
    }),
    ...addonsRoutes(
      addonNav({ base, contract, shape, shapeName, hubPath, addonStepPath })
    ),
    ...spikeEndings({ contract, base, layout, shape, breadcrumbs })
  ]

  return {
    plugin: {
      name: `${slug}-${shapeName}`,
      register(server) {
        server.route(routes)
      }
    }
  }

  // --- start / hub --------------------------------------------------------
  function buildStartAndHub() {
    const list = [
      {
        method: 'GET',
        path: base,
        options: open,
        handler(_request, h) {
          return h.view(chrome.start, {
            pageTitle: 'Get a car insurance quote',
            startAction: `${base}/start`
          })
        }
      },
      {
        method: 'POST',
        path: `${base}/start`,
        options: open,
        handler(_request, h) {
          const draft = createDraft(slug)
          const first = contract.firstStep
          return h.redirect(
            shapeName === 'linear'
              ? `${base}/${draft.id}/${first}`
              : hubPath(draft.id)
          )
        }
      }
    ]
    if (shapeName === 'linear') {
      return list
    }
    list.push({
      method: 'GET',
      path: `${base}/{id}`,
      options: open,
      handler(request, h) {
        const quote = findQuote(request.params.id)
        if (!quote) {
          return h.redirect(base)
        }
        const view = hubViewModel({
          contract,
          base,
          shape,
          shapeName,
          quote,
          addonStepPath
        })
        return h.view(chrome.hub, {
          pageTitle: 'Get a car insurance quote',
          ...view,
          breadcrumbs: [
            { text: 'Prototypes', href: '/prototype' },
            { text: chrome.serviceName, href: base },
            { text: 'Your application' }
          ]
        })
      }
    })
    return list
  }
}

const CHROME = {
  linear: {
    base: (slug) => `/prototype/${slug}/linear`,
    layout: 'linear/layout.njk',
    start: 'linear/start',
    serviceName: 'Linear journey'
  },
  hub: {
    base: (slug) => `/prototype/${slug}/task-list`,
    layout: 'task-list/layout.njk',
    start: 'task-list/start',
    hub: 'task-list/hub',
    serviceName: 'Task list journey'
  },
  grouped: {
    base: (slug) => `/prototype/${slug}/task-list-with-linear-tasks`,
    layout: 'task-list-with-linear-tasks/layout.njk',
    start: 'task-list-with-linear-tasks/start',
    hub: 'task-list-with-linear-tasks/hub',
    serviceName: 'Task list with linear tasks'
  }
}

function navBack(contract, base, id, stepId, shape) {
  const quote = findQuote(id)
  return resolveNav(contract, base, quote, contract.prev(quote, stepId, shape))
}

function navNext(contract, base, id, stepId, shape) {
  const quote = findQuote(id)
  return resolveNav(contract, base, quote, contract.next(quote, stepId, shape))
}

// --- hub view models --------------------------------------------------------

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

function getYourQuoteItem(contract, base, quote) {
  const ready = contract.allComplete(quote)
  return {
    title: { text: 'Get your quote' },
    href: ready ? `${base}/${quote.id}/quote-summary` : undefined,
    status: ready
      ? { tag: { text: 'Not started', classes: 'govuk-tag--blue' } }
      : {
          text: 'Cannot start yet',
          classes: 'govuk-task-list__status--cannot-start-yet'
        }
  }
}

function hubViewModel({
  contract,
  base,
  shape,
  shapeName,
  quote,
  addonStepPath
}) {
  if (shapeName === 'hub') {
    const live = contract.applicableSteps(quote)
    const items = live.map((stepId) => ({
      title: { text: contract.stepTitle(stepId) },
      href: hubLink(contract, base, quote, stepId),
      status: statusTag(contract.status(quote, stepId, shape))
    }))
    items.push(...addonHubItems(quote, addonStepPath))
    items.push(getYourQuoteItem(contract, base, quote))
    const completedCount = live.filter(
      (stepId) => contract.status(quote, stepId, shape) === 'complete'
    ).length
    return { items, completedCount, totalCount: live.length }
  }

  // grouped
  const groups = shape.groups
  const items = groups.map((group) => {
    const liveIds = group.stepIds.filter((id) =>
      contract.applicableSteps(quote).includes(id)
    )
    const statuses = liveIds.map((id) => contract.status(quote, id, shape))
    return {
      title: { text: group.title },
      hint: { text: liveIds.map((id) => contract.stepTitle(id)).join(', ') },
      href: `${base}/${quote.id}/${group.stepIds[0]}`,
      status: groupTag(statuses)
    }
  })
  // Add-ons sit outside the groups, as their own selection task + per-add-on tasks.
  items.push({
    title: { text: contract.stepTitle('addons') },
    href: `${base}/${quote.id}/addons`,
    status: statusTag(contract.status(quote, 'addons', shape))
  })
  items.push(...addonHubItems(quote, addonStepPath))
  items.push(getYourQuoteItem(contract, base, quote))
  const completedCount = groups.filter((group) =>
    group.stepIds
      .filter((id) => contract.applicableSteps(quote).includes(id))
      .every((id) => contract.status(quote, id, shape) === 'complete')
  ).length
  return { items, completedCount, totalCount: groups.length }
}

function hubLink(contract, base, quote, stepId) {
  const kind = contract.stepKind(stepId)
  if (kind === 'loop') {
    return `${base}/${quote.id}/claims`
  }
  if (kind === 'subtasks') {
    return `${base}/${quote.id}/addons`
  }
  return `${base}/${quote.id}/${stepId}`
}

// --- add-on fan-out navigation (shape-specific, not model-driven) -----------

function addonNav({
  base,
  contract,
  shape,
  shapeName,
  hubPath,
  addonStepPath
}) {
  const layout = CHROME[shapeName].layout
  const breadcrumbs =
    shapeName === 'linear'
      ? undefined
      : (quote, title) => [
          { text: 'Prototypes', href: '/prototype' },
          { text: CHROME[shapeName].serviceName, href: base },
          { text: 'Your application', href: hubPath(quote.id) },
          { text: title }
        ]

  if (shapeName === 'linear') {
    const seqIndex = (quote, value, stepIndex) => {
      const stepSlug = addonByValue.get(value).steps[stepIndex].slug
      return addonSequence(quote).findIndex(
        (entry) => entry.value === value && entry.step.slug === stepSlug
      )
    }
    const summaryPath = (id) => `${base}/${id}/quote-summary`
    return {
      basePath: base,
      layout,
      selectionBack: (id) => navBack(contract, base, id, 'addons', shape),
      afterSelection(quote) {
        const seq = addonSequence(quote)
        return seq.length
          ? addonStepPath(quote.id, seq[0].value, seq[0].step.slug)
          : summaryPath(quote.id)
      },
      stepBack(quote, value, stepIndex) {
        const seq = addonSequence(quote)
        const prev = seq[seqIndex(quote, value, stepIndex) - 1]
        return prev
          ? addonStepPath(quote.id, prev.value, prev.step.slug)
          : `${base}/${quote.id}/addons`
      },
      afterStep(quote, value, stepIndex) {
        const seq = addonSequence(quote)
        const next = seq[seqIndex(quote, value, stepIndex) + 1]
        return next
          ? addonStepPath(quote.id, next.value, next.step.slug)
          : summaryPath(quote.id)
      }
    }
  }

  // hub + grouped: each chosen add-on is its own task that returns to the hub.
  return {
    basePath: base,
    layout,
    breadcrumbs,
    selectionBack: (id) => hubPath(id),
    afterSelection: (quote) => hubPath(quote.id),
    stepBack: (quote, value, stepIndex) =>
      stepIndex === 0
        ? hubPath(quote.id)
        : addonStepPath(
            quote.id,
            value,
            addonByValue.get(value).steps[stepIndex - 1].slug
          ),
    afterStep(quote, value, stepIndex) {
      const next = addonByValue.get(value).steps[stepIndex + 1]
      return next
        ? addonStepPath(quote.id, value, next.slug)
        : hubPath(quote.id)
    }
  }
}
