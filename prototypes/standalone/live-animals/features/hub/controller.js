import { BASE, hubPath, pagePath, TEMPLATES } from '../../config.js'
import { sections } from '../../flow/flow.js'
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
  }
]

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

// "Check and submit" is a task row, not a GROUP_ROW: the section owes only
// the declaration (confirmed by submitting), so its tag tracks the submit —
// Not started until the declaration is confirmed — and it must not join the
// completed-tasks count, which counts the answer-gathering sections only.
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
