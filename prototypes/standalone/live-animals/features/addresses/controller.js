import { hubPath, pagePath, TEMPLATES } from '../../config.js'
import * as state from '../../engine/index.js'
import * as kit from '../../shared/kit.js'
import { addressesPage as page } from './page.js'
import { obligations } from './obligations.js'

export const meta = { ...page, collects: kit.collectsFrom(obligations) }
const view = `${TEMPLATES}/features/addresses/template`

/**
 * Landing page for the addresses section — the hub of a hub-and-spoke:
 * it summarises the consignment's parties and links out to one select
 * sub-page per party. The landing OWNS the section's party collects (its
 * `meta` accretes one obligation per landed spoke), but the write happens
 * on each spoke's POST — the same list-owns/entry-commits split as the
 * claims and documents loop hubs. The spokes stay routes-only and never
 * join the section's pages array in flow.js, so Continue here always
 * returns to the hub.
 *
 * Each select increment fills its party's `href` (the sub-page slug) as
 * the page lands; a party with no `href` yet renders as "Not added yet"
 * text with no link, so the landing page never shows a dead link.
 */
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
