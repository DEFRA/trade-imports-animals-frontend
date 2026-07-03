import {
  applyAnswers,
  checkSave,
  evaluate,
  modelJson,
  nextAfter,
  pageViewModel
} from '../contract/index.js'
import {
  BASE,
  breadcrumbs,
  currentJourney,
  LAYOUT,
  pagePath,
  TEMPLATES
} from '../journey/index.js'

/**
 * The generic question pages — one GET/POST pair per 'page'-templated
 * Flow Page, the route list derived from the model. Every decision
 * (slot expansion, the save gate, Save-and-continue navigation) comes
 * from the contract; this file is plumbing. A blocked save round-trips
 * the GDS error summary server-side; `?change=1` returns to CYA.
 */

const flow = JSON.parse(modelJson().flow)

const cyaPath = () => pagePath(flow.checkYourAnswers.slug)

const collectPages = (container) =>
  container.kind === 'page'
    ? [container]
    : (container.children ?? []).flatMap(collectPages)

/** Every Page rendered by the generic template (claims and the quote
 * summary own their routes). */
const questionPages = flow.sections
  .flatMap(collectPages)
  .filter((page) => page.template === 'page')

const scalarOf = (raw) => (Array.isArray(raw) ? raw.at(-1) : raw)

/** Overlay one FieldViewItem with the typed (unsaved) payload values so a
 * blocked save re-renders what the user typed, not the stored answers. */
const overlayField = (item, payload) => {
  const { args } = item
  if (item.type === 'date') {
    for (const part of args.items) {
      const raw = payload[`${args.namePrefix}-${part.name}`]
      if (raw !== undefined) {
        part.value = scalarOf(raw)
      }
    }
    return
  }
  if (item.type === 'radios' || item.type === 'checkboxes') {
    const values = [].concat(payload[args.name] ?? [])
    for (const option of args.items) {
      if (Object.hasOwn(payload, args.name)) {
        option.checked = values.includes(option.value)
      }
      if (option.reveal) {
        overlayField(option.reveal, payload)
      }
    }
    return
  }
  if (!Object.hasOwn(payload, args.name)) {
    return
  }
  if (item.type === 'select') {
    for (const option of args.items) {
      option.selected = option.value === scalarOf(payload[args.name])
    }
    return
  }
  args.value = scalarOf(payload[args.name])
}

const viewContext = (viewModel, request, extras = {}) => ({
  layout: LAYOUT,
  pageTitle: viewModel.title,
  ...viewModel,
  backLink: request.query.change ? cyaPath() : viewModel.backLink,
  breadcrumbs: breadcrumbs(viewModel.title),
  ...extras
})

const getHandler = (page) => (request, responseToolkit) => {
  const journey = currentJourney(request, responseToolkit)
  const viewModel = pageViewModel(page.id, evaluate(journey))
  return responseToolkit.view(
    `${TEMPLATES}/page`,
    viewContext(viewModel, request)
  )
}

const postHandler = (page) => (request, responseToolkit) => {
  const journey = currentJourney(request, responseToolkit)
  const payload = request.payload ?? {}
  const evaluation = evaluate(journey)
  const check = checkSave(page.id, payload, evaluation)
  if (!check.ok) {
    const viewModel = pageViewModel(page.id, evaluation, check.fieldErrors)
    viewModel.fields.forEach((field) => overlayField(field, payload))
    return responseToolkit.view(
      `${TEMPLATES}/page`,
      viewContext(viewModel, request, { errorSummary: check.errorSummary })
    )
  }
  const saved = applyAnswers(journey, page.id, payload)
  return responseToolkit.redirect(
    request.query.change ? cyaPath() : nextAfter(page.id, saved.evaluation)
  )
}

const options = (pageId) => ({ auth: false, app: { surface: 'page', pageId } })

/** GET/POST routes for every plain question page, plus the add-ons
 * catch-all: an unknown add-on step 302s back to the picker (spike-a
 * parity — its only deep-link redirect). */
export function pageRoutes() {
  return [
    ...questionPages.flatMap((page) => [
      {
        method: 'GET',
        path: pagePath(page.slug),
        options: options(page.id),
        handler: getHandler(page)
      },
      {
        method: 'POST',
        path: pagePath(page.slug),
        options: options(page.id),
        handler: postHandler(page)
      }
    ]),
    {
      method: 'GET',
      path: `${BASE}/addons/{rest*}`,
      options: options('addons'),
      handler: (_request, responseToolkit) =>
        responseToolkit.redirect(pagePath('addons'))
    }
  ]
}
