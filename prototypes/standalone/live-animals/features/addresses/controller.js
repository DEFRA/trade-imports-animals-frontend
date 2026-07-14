import { hubPath, pagePath, TEMPLATES } from '../../config.js'
import * as state from '../../engine/index.js'
import * as kit from '../../shared/kit.js'
import { cphApplies } from '../cph-number/controller.js'
import { addressesPage as page } from './page.js'
import { obligations } from './obligations.js'
import { PARTIES } from './parties.js'

export const meta = { ...page, collects: kit.collectsFrom(obligations) }
const view = `${TEMPLATES}/features/addresses/template`

const CPH_ROW = {
  title: 'County Parish Holding number (CPH)',
  hint: 'The County Parish Holding (CPH) number identifies the holding where the animals will be kept.',
  slug: 'cph-number?return=addresses'
}

const hubRow = ({ title, hint, slug }, valueText) => ({
  key: {
    html: `<span>${title}</span><span class="govuk-hint govuk-!-display-block govuk-!-margin-bottom-0">${hint}</span>`
  },
  value: { text: valueText || 'Not added yet' },
  actions: {
    items: [
      {
        href: pagePath(slug),
        text: valueText ? 'Change' : 'Add',
        visuallyHiddenText: title.toLowerCase()
      }
    ]
  }
})

const rows = (answers) => [
  ...PARTIES.map((party) => hubRow(party, answers[party.id]?.name)),
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
