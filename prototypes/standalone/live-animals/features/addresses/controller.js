import { hubPath, pagePath, TEMPLATES } from '../../config.js'
import * as state from '../../engine/index.js'
import * as kit from '../../shared/kit.js'
import { addressesPage as page } from './page.js'

const view = `${TEMPLATES}/features/addresses/template`

/**
 * Landing page for the addresses section — the hub of a hub-and-spoke:
 * it summarises the consignment's parties and links out to one select
 * sub-page per party. It collects nothing itself, so like the dashboard
 * it is routes-only: no obligations file, no dispatch registration and
 * no contract case.
 *
 * Each select increment fills its party's `href` (the sub-page slug) as
 * the page lands; a party with no `href` yet renders as "Not added yet"
 * text with no link, so the landing page never shows a dead link.
 */
const PARTY_ROWS = [
  { id: 'placeOfOrigin', label: 'Place of origin' },
  { id: 'consignor', label: 'Consignor' },
  { id: 'consignee', label: 'Consignee' },
  { id: 'importer', label: 'Importer' },
  { id: 'placeOfDestination', label: 'Place of destination' }
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
