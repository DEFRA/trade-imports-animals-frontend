import { hubPath, pagePath, TEMPLATES } from '../../config.js'
import * as state from '../../engine/index.js'
import * as kit from '../../shared/kit.js'
import { cphApplies } from '../cph-number/controller.js'
import { addressesPage as page } from './page.js'
import { obligations } from './obligations.js'

export const meta = { ...page, collects: kit.collectsFrom(obligations) }
const view = `${TEMPLATES}/features/addresses/template`

const PARTY_ROWS = [
  {
    id: 'placeOfOrigin',
    label: 'Place of origin',
    hint: 'The address where the animals begin their journey to Great Britain',
    href: 'place-of-origin/select'
  },
  {
    id: 'consignor',
    label: 'Consignor or exporter',
    hint: 'This is the sender of the consignment.',
    href: 'consignors/select'
  },
  {
    id: 'consignee',
    label: 'Consignee',
    hint: 'This is the receiver or buyer of the consignment being shipped or transported.',
    href: 'consignees/select'
  },
  {
    id: 'importer',
    label: 'Importer',
    hint: 'This is usually the same as the consignee. You can select a different person if needed.',
    href: 'importers/select'
  },
  {
    id: 'placeOfDestination',
    label: 'Place of destination',
    hint: 'This is where the animals will be unloaded and accommodated for at least 48 hours. If a health certificate is required, it will show this address.',
    href: 'destinations/select'
  }
]

const CPH_ROW = {
  id: 'countyParishHoldingCph',
  label: 'County Parish Holding number (CPH)',
  hint: 'The County Parish Holding (CPH) number identifies the holding where the animals will be kept.',
  href: 'cph-number?return=addresses'
}

const hubRow = ({ label, hint, href }, valueText) => ({
  key: {
    html: `<span>${label}</span><span class="govuk-hint govuk-!-display-block govuk-!-margin-bottom-0">${hint}</span>`
  },
  value: { text: valueText || 'Not added yet' },
  actions: {
    items: [
      {
        href: pagePath(href),
        text: valueText ? 'Change' : 'Add',
        visuallyHiddenText: label.toLowerCase()
      }
    ]
  }
})

const rows = (answers) => [
  ...PARTY_ROWS.map((party) => hubRow(party, answers[party.id]?.name)),
  ...(cphApplies(answers)
    ? [hubRow(CPH_ROW, answers.countyParishHoldingCph)]
    : [])
]

const get = async (request, h) => {
  const { journey, answers } = await state.get(request, h)
  return h.view(view, {
    ...kit.base('Consignment addresses', { backLink: hubPath(), journey }),
    heading: 'Consignment addresses',
    rows: rows(answers)
  })
}

const post = async (request, h) => {
  const { scope } = await state.get(request, h)
  return h.redirect(await kit.nextTarget(request, page, scope))
}

export const routes = kit.pageRoutes(page, { get, post })
