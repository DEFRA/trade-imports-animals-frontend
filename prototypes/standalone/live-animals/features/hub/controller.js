import { BASE, hubPath, pagePath, TEMPLATES } from '../../config.js'
import { sections } from '../../flow/flow.js'
import { sectionGatePasses } from '../../flow/gates.js'
import { sectionEntry } from '../../flow/navigation.js'
import * as state from '../../engine/index.js'
import { FULFILLED, IN_PROGRESS } from '../../engine/status.js'
import { sectionStatus } from '../../flow/section-status.js'
import { open } from '../../shared/kit.js'

const view = `${TEMPLATES}/features/hub/template`

const GROUP_ROWS = [
  {
    id: 'origin',
    title: 'Origin of the import',
    hint: 'Country of origin, region of origin code, your internal reference'
  },
  {
    id: 'commodities',
    title: 'Commodities',
    hint: 'The commodities, species and numbers of animals you are importing'
  },
  {
    id: 'consignment',
    title: 'About the consignment',
    hint: 'Why you are importing the animals and their purpose in the internal market'
  },
  {
    id: 'documents',
    title: 'Accompanying documents',
    hint: 'Certificates, permits and other documents for the consignment'
  },
  {
    id: 'addresses',
    title: 'Addresses',
    hint: 'The consignor, consignee, importer and the places of origin and destination'
  },
  {
    id: 'transport',
    title: 'Transport',
    hint: 'The port of entry, when the consignment will arrive, how the animals will travel and who transports them'
  },
  {
    id: 'contact',
    title: 'Contact address',
    hint: 'Who we should contact about this notification'
  },
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
 * Fail loud: a dynamic section with no authored copy entry is a
 * missing-copy bug, not a blank/`undefined` row.
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

const NOT_STARTED_TAG = {
  tag: { text: 'Not started', classes: 'govuk-tag--grey' }
}
const STATUS_TAG = {
  [FULFILLED]: { text: 'Completed' },
  [IN_PROGRESS]: {
    tag: { text: 'In progress', classes: 'govuk-tag--light-blue' }
  }
}
const statusTag = (status) => STATUS_TAG[status] ?? NOT_STARTED_TAG

const sectionById = (id) => sections.find((section) => section.id === id)

const buildGroupItems = (answers, scope, inScope) =>
  GROUP_ROWS.map((row) => ({
    title: { text: row.title },
    hint: { text: row.hint },
    href: sectionEntry(row.id, scope),
    status: statusTag(sectionStatus(sectionById(row.id), answers, inScope))
  }))

const buildPickerItem = (answers, inScope) => ({
  title: { text: 'Add to your policy' },
  href: pagePath('addons'),
  status: statusTag(
    'addons' in answers
      ? FULFILLED
      : sectionStatus(sectionById('add-to-your-policy'), answers, inScope)
  )
})

const buildAddonItems = (answers, scope, inScope) =>
  sections
    .filter((section) => section.dynamic && sectionGatePasses(section, scope))
    .map((section) => {
      const copy = addonCopy(section.id)
      return {
        title: { text: copy.title },
        hint: { text: copy.hint },
        href: sectionEntry(section.id, scope),
        status: statusTag(sectionStatus(section, answers, inScope))
      }
    })

// "Check and submit" is a task row, not a GROUP_ROW: it collects nothing,
// so its status derives Not applicable (rendered "Not started") and it must
// not join the completed-tasks count, which only Fulfilled sections can move.
const buildReviewItem = (answers, scope, inScope) => ({
  title: { text: 'Check and submit' },
  hint: { text: 'Check your answers before you submit the notification' },
  href: sectionEntry('review', scope),
  status: statusTag(sectionStatus(sectionById('review'), answers, inScope))
})

const buildQuoteItem = (scope) =>
  scope.readyForQuote
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

const countCompletedGroups = (answers, inScope) =>
  GROUP_ROWS.filter(
    (row) => sectionStatus(sectionById(row.id), answers, inScope) === FULFILLED
  ).length

const handler = (request, h) => {
  const { answers, scope } = state.get(request, h)
  const inScope = scope.inScope

  return h.view(view, {
    pageTitle: 'Get a car insurance quote',
    heading: 'Get a car insurance quote',
    progressLine: `You have completed ${countCompletedGroups(answers, inScope)} of ${GROUP_ROWS.length} tasks.`,
    items: [
      ...buildGroupItems(answers, scope, inScope),
      buildPickerItem(answers, inScope),
      ...buildAddonItems(answers, scope, inScope),
      buildQuoteItem(scope),
      buildReviewItem(answers, scope, inScope)
    ],
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
