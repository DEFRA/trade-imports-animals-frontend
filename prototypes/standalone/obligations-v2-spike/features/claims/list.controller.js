import { hubPath, pagePath, TEMPLATES } from '../../config.js'
import * as state from '../../engine/index.js'
import * as kit from '../../shared/kit.js'
import { CLAIM_TYPE_LABEL } from './entry.controller.js'

/**
 * Claims manage-list — the "loop hub". Bespoke by nature (a repeating
 * collection has no uniform-widget projection): it owns its Claim-N rows,
 * its add/continue buttons and their exact copy. The add button label is
 * page copy that flips on the row count. `Continue` marks the loop done
 * and advances; `Add` hands off to the entry sub-page.
 */
const page = { id: 'claims', slug: 'claims' }
export const meta = { ...page, collects: ['claims'] }
const view = `${TEMPLATES}/features/claims/list`

const claimValue = (claim) => {
  const label = CLAIM_TYPE_LABEL[claim.claimType] ?? 'Not provided'
  const amount = (claim.claimAmount ?? '').toString().trim()
  return amount ? `${label} — £${amount}` : label
}

const get = (request, h) => {
  const { answers } = state.get(request, h)
  // The reusable loop library gives the instance FACTS (index, path, entry);
  // this controller composes the bespoke Claim-N rows + copy over them.
  const rows = state
    .collectionView(answers, ['claims'])
    .map(({ index, entry }) => ({
      key: { text: `Claim ${index + 1}` },
      value: { text: claimValue(entry) },
      actions: {
        items: [
          {
            href: pagePath(`claims/${index}/remove`),
            text: 'Remove',
            visuallyHiddenText: `claim ${index + 1}`
          }
        ]
      }
    }))
  return h.view(view, {
    ...kit.base('Your claims', { backLink: hubPath() }),
    heading: 'Claims you have added',
    rows,
    hasClaims: rows.length > 0,
    addButtonText: rows.length ? 'Add another claim' : 'Add a claim',
    emptyText: 'You have not added any claims yet.'
  })
}

const post = (request, h) => {
  const payload = request.payload ?? {}
  if (payload.action === 'add') {
    return h.redirect(pagePath('claims/add'))
  }
  const { scope } = state.get(request, h) // Continue: no write, just advance
  return h.redirect(kit.nextTarget(request, page, scope))
}

export const routes = kit.pageRoutes(page, { get, post })
