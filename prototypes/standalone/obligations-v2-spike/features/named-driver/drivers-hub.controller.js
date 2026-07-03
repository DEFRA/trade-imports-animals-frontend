import { hubPath, pagePath, TEMPLATES } from '../../config.js'
import * as state from '../../engine/index.js'
import * as kit from '../../shared/kit.js'

/**
 * Drivers manage-list — the OUTER loop hub (DISCUSSION-LOG entry 6b). Bespoke
 * like the claims hub, but its rows are driver instances and each links INTO a
 * driver's own detail page (which holds that driver's nested claims sub-hub) —
 * a loop whose items contain a loop. It composes its rows over the SAME
 * `collectionView` facts library the claims hub uses, one level up.
 */
const page = { id: 'drivers', slug: 'addons/named-driver' }
export const meta = { ...page, collects: ['drivers'] }
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
  const { scope } = state.get(request, h) // Continue: no write, just advance
  return h.redirect(kit.nextTarget(request, page, scope))
}

export const routes = kit.pageRoutes(page, { get, post })
