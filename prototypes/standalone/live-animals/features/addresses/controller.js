import { hubPath, pagePath, TEMPLATES } from '../../config.js'
import * as state from '../../engine/index.js'
import * as kit from '../../shared/kit.js'
import { copyFor } from '../../shared/copy.js'
import { cphApplies } from '../cph-number/controller.js'
import { addressesPage as page } from './page.js'
import { PARTIES } from './parties.js'
import { copy as en } from './copy.en.js'
import { copy as cy } from './copy.cy.js'

export const meta = {
  ...page,
  collects: [
    'consignor',
    'placeOfDestination',
    'placeOfOrigin',
    'consignee',
    'importer'
  ]
}
const view = `${TEMPLATES}/features/addresses/template`

const copy = copyFor({ en, cy }).hub

const CPH_ROW = {
  ...copy.cph,
  slug: 'cph-number?return=addresses'
}

const hubRow = ({ title, hint, slug }, valueText) => ({
  key: {
    html: `<span>${title}</span><span class="govuk-hint govuk-!-display-block govuk-!-margin-bottom-0">${hint}</span>`
  },
  value: { text: valueText || copy.notAddedYet },
  actions: {
    items: [
      {
        href: pagePath(slug),
        text: valueText ? copy.change : copy.add,
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
    ...kit.base(copy.title, { backLink: hubPath(), journey }),
    copy,
    rows: rows(answers)
  })
}

const post = async (request, h) => {
  const { scope } = await state.get(request, h)
  return h.redirect(await kit.nextTarget(request, page, scope))
}

export const routes = kit.pageRoutes(page, { get, post })
