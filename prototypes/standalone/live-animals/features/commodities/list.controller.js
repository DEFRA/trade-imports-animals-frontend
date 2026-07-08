import { hubPath, pagePath, TEMPLATES } from '../../config.js'
import * as state from '../../engine/index.js'
import * as kit from '../../shared/kit.js'
import { open } from '../../shared/kit.js'
import { commoditiesPage as page } from './page.js'
import { obligations } from './obligations.js'

export const meta = { ...page, collects: kit.collectsFrom(obligations) }
const view = `${TEMPLATES}/features/commodities/list`

export const commodityLineValue = (entry) => {
  const commodity = (entry.commoditySelection ?? '').trim() || 'Not provided'
  const quantity = (entry.numberOfAnimalsQuantity ?? '').toString().trim()
  if (!quantity) return commodity
  return `${commodity} — ${quantity} ${quantity === '1' ? 'animal' : 'animals'}`
}

const get = (request, h) => {
  const { answers } = state.get(request, h)
  const rows = state
    .collectionView(answers, ['commodityLines'])
    .map(({ index, entry }) => ({
      key: { text: `Commodity ${index + 1}` },
      value: { text: commodityLineValue(entry) },
      actions: {
        items: [
          {
            href: pagePath(`commodities/${index}/details`),
            text: 'Change',
            visuallyHiddenText: `commodity ${index + 1}`
          },
          {
            href: pagePath(`commodities/${index}/identifiers`),
            text: 'Animal identifiers',
            visuallyHiddenText: `for commodity ${index + 1}`
          },
          {
            href: pagePath(`commodities/${index}/remove`),
            text: 'Remove',
            visuallyHiddenText: `commodity ${index + 1}`
          }
        ]
      }
    }))
  return h.view(view, {
    ...kit.base('Commodities', { backLink: hubPath() }),
    heading: 'Commodities you have added',
    rows,
    hasLines: rows.length > 0,
    addButtonText: rows.length ? 'Add another commodity' : 'Add a commodity',
    emptyText: 'You have not added any commodities yet.'
  })
}

const post = (request, h) => {
  const payload = request.payload ?? {}
  if (payload.action === 'add') {
    return h.redirect(pagePath('commodities/select'))
  }
  const { scope } = state.get(request, h)
  return h.redirect(kit.nextTarget(request, page, scope))
}

const getRemove = (request, h) => {
  state.removeEntry(request, h, 'commodityLines', Number(request.params.index))
  return h.redirect(pagePath('commodities'))
}

export const routes = [
  ...kit.pageRoutes(page, { get, post }),
  {
    method: 'GET',
    path: pagePath('commodities/{index}/remove'),
    options: open,
    handler: getRemove
  }
]
