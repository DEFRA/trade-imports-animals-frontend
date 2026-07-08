import { BASE, hubPath, TEMPLATES } from '../../config.js'
import { sections } from '../../flow/flow.js'
import { sectionEntry } from '../../flow/navigation.js'
import { sectionGatePasses } from '../../flow/gates.js'
import * as state from '../../engine/index.js'
import {
  FULFILLED,
  IN_PROGRESS,
  NOT_STARTED,
  OPTIONAL
} from '../../engine/status.js'
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

const STATUS_TAG = {
  [FULFILLED]: { tag: { text: 'Completed', classes: 'govuk-tag--green' } },
  [OPTIONAL]: { text: 'Optional' },
  [IN_PROGRESS]: {
    tag: { text: 'In progress', classes: 'govuk-tag--light-blue' }
  },
  [NOT_STARTED]: {
    tag: { text: 'Not yet started', classes: 'govuk-tag--blue' }
  }
}
const statusTag = (status) => STATUS_TAG[status] ?? STATUS_TAG[NOT_STARTED]

const CANNOT_START_STATUS = {
  text: 'Cannot start yet',
  classes: 'govuk-task-list__status--cannot-start-yet'
}

const sectionById = (id) => sections.find((section) => section.id === id)

const buildRow = ({ id, title, hint }, answers, scope, inScope) => {
  const section = sectionById(id)
  const base = { title: { text: title }, hint: { text: hint } }
  if (!sectionGatePasses(section, scope)) {
    return { ...base, status: CANNOT_START_STATUS }
  }
  return {
    ...base,
    href: sectionEntry(id, scope),
    status: statusTag(sectionStatus(section, answers, inScope))
  }
}

const buildGroupItems = (answers, scope, inScope) =>
  GROUP_ROWS.map((row) => buildRow(row, answers, scope, inScope))

const buildReviewItem = (answers, scope, inScope) =>
  buildRow(
    {
      id: 'review',
      title: 'Check and submit',
      hint: 'Check your answers before you submit the notification'
    },
    answers,
    scope,
    inScope
  )

const countCompletedGroups = (answers, inScope) =>
  GROUP_ROWS.filter(
    (row) => sectionStatus(sectionById(row.id), answers, inScope) === FULFILLED
  ).length

const handler = (request, h) => {
  const { answers, scope } = state.get(request, h)
  const inScope = scope.inScope

  return h.view(view, {
    pageTitle: 'Import notification service',
    heading: 'Import notification service',
    progressLine: `You have completed ${countCompletedGroups(answers, inScope)} of ${GROUP_ROWS.length} tasks.`,
    items: [
      ...buildGroupItems(answers, scope, inScope),
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
