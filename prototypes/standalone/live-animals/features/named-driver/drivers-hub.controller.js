import { hubPath, pagePath, TEMPLATES } from '../../config.js'
import * as state from '../../engine/index.js'
import * as kit from '../../shared/kit.js'
import { driversPage as page } from './page.js'
import { obligations } from './obligations.js'

export const meta = { ...page, collects: kit.collectsFrom(obligations) }
const view = `${TEMPLATES}/features/named-driver/drivers-hub`

const driverSummary = (entry) => {
  const name = (entry.driverName ?? '').trim() || 'Unnamed driver'
  const claimCount = (entry.claims ?? []).length
  return claimCount ? `${name} — ${claimCount} claim(s)` : name
}

const get = (request, h) => {
  const { answers } = state.get(request, h)
  const rows = state
    .collectionView(answers, ['drivers'])
    .map(({ index, entry }) => ({
      key: { text: `Driver ${index + 1}` },
      value: { text: driverSummary(entry) },
      actions: {
        items: [
          {
            href: pagePath(`addons/named-driver/${index}`),
            text: 'Change',
            visuallyHiddenText: `driver ${index + 1}`
          },
          {
            href: pagePath(`addons/named-driver/${index}/remove`),
            text: 'Remove',
            visuallyHiddenText: `driver ${index + 1}`
          }
        ]
      }
    }))
  return h.view(view, {
    ...kit.base('Named drivers', { backLink: hubPath() }),
    heading: 'Named drivers you have added',
    rows,
    hasDrivers: rows.length > 0,
    addButtonText: rows.length ? 'Add another driver' : 'Add a driver',
    emptyText: 'You have not added any named drivers yet.'
  })
}

const post = (request, h) => {
  const payload = request.payload ?? {}
  if (payload.action === 'add') {
    return h.redirect(pagePath('addons/named-driver/add'))
  }
  const { scope } = state.get(request, h)
  return h.redirect(kit.nextTarget(request, page, scope))
}

export const routes = kit.pageRoutes(page, { get, post })
