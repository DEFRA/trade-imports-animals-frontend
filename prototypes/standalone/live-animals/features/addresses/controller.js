import { hubPath, pagePath, TEMPLATES } from '../../config.js'
import * as state from '../../engine/index.js'
import * as kit from '../../shared/kit.js'
import { addressesPage as page } from './page.js'
import { obligations } from './obligations.js'

export const meta = { ...page, collects: kit.collectsFrom(obligations) }
const view = `${TEMPLATES}/features/addresses/template`

const PARTY_ROWS = [
  {
    id: 'placeOfOrigin',
    label: 'Place of origin',
    href: 'place-of-origin/select'
  },
  { id: 'consignor', label: 'Consignor', href: 'consignors/select' },
  { id: 'consignee', label: 'Consignee', href: 'consignees/select' },
  { id: 'importer', label: 'Importer', href: 'importers/select' },
  {
    id: 'placeOfDestination',
    label: 'Place of destination',
    href: 'destinations/select'
  }
]

const partyRow = (party, answers) => {
  const entry = answers[party.id]
  return {
    key: { text: party.label },
    value: { text: entry?.name ?? 'Not added yet' },
    actions: party.href
      ? {
          items: [
            {
              href: pagePath(party.href),
              text: entry ? 'Change' : 'Add',
              visuallyHiddenText: party.label.toLowerCase()
            }
          ]
        }
      : undefined
  }
}

const get = (request, h) => {
  const { answers } = state.get(request, h)
  return h.view(view, {
    ...kit.base('Addresses', { backLink: hubPath() }),
    heading: 'Addresses',
    rows: PARTY_ROWS.map((party) => partyRow(party, answers))
  })
}

const post = (request, h) => {
  const { scope } = state.get(request, h)
  return h.redirect(kit.nextTarget(request, page, scope))
}

export const routes = kit.pageRoutes(page, { get, post })
