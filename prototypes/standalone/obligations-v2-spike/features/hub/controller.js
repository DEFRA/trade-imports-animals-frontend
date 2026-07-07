import { BASE, hubPath, pagePath, TEMPLATES } from '../../config.js'
import { sections } from '../../flow/flow.js'
import { sectionEntry } from '../../flow/navigation.js'
import * as state from '../../engine/index.js'
import { FULFILLED, IN_PROGRESS } from '../../engine/status.js'
import { sectionStatus } from '../../flow/section-status.js'
import { open } from '../../shared/kit.js'

/**
 * The task-list hub. It OWNS the task-link copy (titles + hints) — that is
 * page/presentation, so it lives here, not in the flow — and asks the pure
 * `sectionStatus` roll-up for each row's tag and `sectionEntry` for its
 * href. Three always-live group tasks, the add-on picker, one row per
 * selected add-on, and the quote row (inert until the state layer reports
 * `readyForQuote`).
 */
const view = `${TEMPLATES}/features/hub/template`

const GROUP_ROWS = [
  { id: 'email', title: 'Email', hint: 'Where we send your quote' },
  {
    id: 'about-you-and-your-vehicle',
    title: 'About you and your vehicle',
    hint: 'About you, Your vehicle'
  },
  {
    id: 'your-driving-and-cover',
    title: 'Your driving and cover',
    hint: 'Driving history, Choose your cover, Optional extras'
  }
]

const ADDON_COPY = {
  'named-driver': {
    title: 'Add a named driver',
    hint: 'People you want insured to drive your vehicle'
  },
  modifications: {
    title: 'Declare vehicle modifications',
    hint: 'Changes to your vehicle and their value'
  },
  'protected-ncd': {
    title: 'Protect your no-claims discount',
    hint: 'Keep your discount if you make a claim'
  }
}

/**
 * Hub copy for one add-on section. Fails loud: a dynamic section with no
 * authored entry is a missing-copy bug, not a blank/`undefined` row.
 */
export const addonCopy = (id) => {
  const copy = ADDON_COPY[id]
  if (!copy) {
    throw new Error(
      `No hub copy for add-on section '${id}' — add a title and hint to ` +
        'ADDON_COPY in features/hub/controller.js'
    )
  }
  return copy
}

const statusTag = (status) => {
  if (status === FULFILLED) return { text: 'Completed' }
  if (status === IN_PROGRESS) {
    return { tag: { text: 'In progress', classes: 'govuk-tag--light-blue' } }
  }
  return { tag: { text: 'Not started', classes: 'govuk-tag--grey' } }
}

const sectionById = (id) => sections.find((s) => s.id === id)

const handler = (request, h) => {
  const { answers, scope } = state.get(request, h)
  const inScope = scope.inScope

  const groupItems = GROUP_ROWS.map((row) => ({
    title: { text: row.title },
    hint: { text: row.hint },
    href: sectionEntry(row.id, scope),
    status: statusTag(sectionStatus(sectionById(row.id), answers, inScope))
  }))

  const pickerSection = sectionById('add-to-your-policy')
  const pickerItem = {
    title: { text: 'Add to your policy' },
    href: pagePath('addons'),
    status: statusTag(
      'addons' in answers
        ? FULFILLED
        : sectionStatus(pickerSection, answers, inScope)
    )
  }

  const addonItems = sections
    .filter((s) => s.dynamic && s.gate(scope))
    .map((s) => {
      const copy = addonCopy(s.id)
      return {
        title: { text: copy.title },
        hint: { text: copy.hint },
        href: sectionEntry(s.id, scope),
        status: statusTag(sectionStatus(s, answers, inScope))
      }
    })

  const quoteItem = scope.readyForQuote
    ? {
        title: { text: 'Get your quote' },
        href: pagePath('quote-summary'),
        status: { tag: { text: 'Not started', classes: 'govuk-tag--grey' } }
      }
    : {
        title: { text: 'Get your quote' },
        status: {
          text: 'Cannot start yet',
          classes: 'govuk-task-list__status--cannot-start-yet'
        }
      }

  const completed = GROUP_ROWS.filter(
    (row) => sectionStatus(sectionById(row.id), answers, inScope) === FULFILLED
  ).length

  return h.view(view, {
    pageTitle: 'Get a car insurance quote',
    heading: 'Get a car insurance quote',
    progressLine: `You have completed ${completed} of ${GROUP_ROWS.length} tasks.`,
    items: [...groupItems, pickerItem, ...addonItems, quoteItem],
    breadcrumbs: [
      { text: 'Prototypes', href: '/prototype-standalone' },
      { text: 'Obligations v2 (standalone)', href: BASE },
      { text: 'Your application' }
    ]
  })
}

export const routes = [
  { method: 'GET', path: hubPath(), options: open, handler }
]
