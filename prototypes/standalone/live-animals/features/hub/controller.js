import { hubPath, pagePath, TEMPLATES } from '../../config.js'
import { sections } from '../../flow/flow.js'
import { rowEntry, rowGatePasses, sectionEntry } from '../../flow/navigation.js'
import { sectionGatePasses } from '../../flow/gates.js'
import * as state from '../../engine/index.js'
import {
  FULFILLED,
  IN_PROGRESS,
  NA,
  NOT_STARTED,
  OPTIONAL
} from '../../model/bridge/status.js'
import { sectionStatus } from '../../flow/section-status.js'
import { rowStatus, taskRowById } from '../../flow/task-rows.js'
import { completeOpeningRun } from '../../flow/run-state.js'
import { dashboardPage } from '../dashboard/page.js'
import { journeyStrip, open } from '../../shared/kit.js'

const view = `${TEMPLATES}/features/hub/template`

const GROUPS = [
  {
    id: 'about-the-consignment',
    caption: '1. About the consignment',
    rows: [
      {
        id: 'origin',
        title: 'Where is this consignment coming from?',
        hint: 'Country of origin, region of origin code, your internal reference'
      },
      {
        id: 'commodities',
        title: 'What are you importing?',
        hint: 'The commodities, species and numbers of animals you are importing'
      },
      {
        id: 'importReason',
        title: 'Main reason for importing',
        hint: 'Why you are importing the animals and their purpose in the internal market'
      }
    ]
  },
  {
    id: 'commodity-details',
    caption: '2. Commodity details',
    rows: [
      {
        id: 'additionalDetails',
        title: 'Additional commodity details',
        hint: 'What the animals are certified for and whether any are unweaned'
      },
      {
        id: 'animalIdentification',
        title: 'Animal identification details',
        hint: 'Identification details for the animals in each commodity'
      }
    ]
  },
  {
    id: 'movement',
    caption: '3. Movement',
    rows: [
      {
        id: 'arrivalDetails',
        title: 'Arrival details',
        hint: 'The port of entry, when the consignment will arrive and how the animals will travel'
      },
      {
        id: 'transitCountries',
        title: 'Transit countries',
        hint: 'The countries the consignment will travel through'
      },
      {
        id: 'transporter',
        title: 'Transporter',
        hint: 'Who transports the animals to their destination'
      }
    ]
  },
  {
    id: 'addresses',
    caption: '4. Addresses',
    rows: [
      {
        id: 'addresses',
        title: 'Roles and addresses',
        hint: 'The consignor, consignee, importer and the places of origin and destination'
      },
      {
        id: 'contact',
        title: 'Contact address',
        hint: 'Who we should contact about this notification'
      }
    ]
  },
  {
    id: 'documents',
    caption: '5. Documents',
    rows: [
      {
        id: 'documents',
        title: 'Uploaded documents',
        hint: 'Certificates, permits and other documents for the consignment'
      }
    ]
  },
  {
    id: 'check-and-submit',
    caption: '6. Check and submit',
    rows: [
      {
        id: 'review',
        title: 'Check and submit',
        hint: 'Check your answers before you submit the notification'
      }
    ]
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

const reviewSection = () => sections.find((section) => section.id === 'review')

const buildReviewItem = ({ title, hint }, answers, scope) => {
  const section = reviewSection()
  const base = { title: { text: title }, hint: { text: hint } }
  if (!sectionGatePasses(section, scope)) {
    return { ...base, status: CANNOT_START_STATUS }
  }
  return {
    ...base,
    href: sectionEntry('review', scope),
    status: statusTag(sectionStatus(section, answers, scope.inScope))
  }
}

const buildRowItem = ({ id, title, hint }, answers, scope) => {
  if (id === 'review') return buildReviewItem({ title, hint }, answers, scope)
  const row = taskRowById(id)
  const status = rowStatus(row, answers, scope.inScope)
  if (row.conditional && status === NA) return null
  const base = { title: { text: title }, hint: { text: hint } }
  if (!rowGatePasses(row, scope)) {
    return { ...base, status: CANNOT_START_STATUS }
  }
  return { ...base, href: rowEntry(row, scope), status: statusTag(status) }
}

const buildGroups = (answers, scope) =>
  GROUPS.map((group) => ({
    id: group.id,
    caption: group.caption,
    items: group.rows
      .map((row) => buildRowItem(row, answers, scope))
      .filter(Boolean)
  }))

const toCount = (value) => {
  const count = Number((value ?? '').toString().trim())
  return Number.isFinite(count) ? count : 0
}

const sumOverLines = (lines, field) =>
  lines.reduce((total, { entry }) => total + toCount(entry[field]), 0)

const buildCommodityTotals = (answers) => {
  const lines = state.collectionView(answers, ['commodityLines'])
  if (lines.length === 0) return null
  return {
    animals: sumOverLines(lines, 'numberOfAnimalsQuantity'),
    packages: sumOverLines(lines, 'numberOfPackages')
  }
}

const handler = async (request, h) => {
  await completeOpeningRun(request, h)
  const { journey, answers, scope } = await state.get(request, h)

  return h.view(view, {
    pageTitle: 'Overview',
    heading: 'Overview',
    journeyStrip: journeyStrip(journey),
    commodityTotals: buildCommodityTotals(answers),
    groups: buildGroups(answers, scope),
    dashboardHref: pagePath(dashboardPage.slug),
    backLink: pagePath(dashboardPage.slug),
    breadcrumbs: false
  })
}

export const routes = [
  { method: 'GET', path: hubPath(), options: open, handler }
]
