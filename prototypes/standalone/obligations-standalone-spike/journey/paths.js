import { BASE } from './config.js'

/**
 * URL builders over the shell. There is NO {id} path segment anywhere —
 * the journeyId travels in a BASE-scoped cookie (journey-context.js).
 * [provisional — FULF-2 vs STATUS-X1_5] Cookie-carried journeyId trades
 * spike-a's pinned shareable URLs for one-journey-per-browser isolation;
 * labelled per graft 2 and the README provisional-settlements register.
 */

/** The start page lives at BASE itself; its POST action at /start. */
export const startPath = () => `${BASE}/start`

export const hubPath = () => `${BASE}/hub`

/** Page URL from a Flow slug (slugs may nest, e.g. addons/…/years). */
export const pagePath = (slug) => `${BASE}/${slug}`

/** A CYA Change round trip: save returns to CYA, not the next page. */
export const changePath = (slug) => `${pagePath(slug)}?change=1`

/**
 * Sentinel translation for navigation results: a Page slug string maps
 * to its URL; `{ terminal: 'hub' | 'start' }` marks the two journey
 * bookends. Unknown results throw — a wrong sentinel is a coding error,
 * never a redirect-to-somewhere-quiet.
 */
export const resolveNav = (result) => {
  if (typeof result === 'string') {
    return pagePath(result)
  }
  if (result?.terminal === 'hub') {
    return hubPath()
  }
  if (result?.terminal === 'start') {
    return BASE
  }
  throw new Error(`Unknown navigation sentinel ${JSON.stringify(result)}`)
}

/** Breadcrumbs keep the hub reachable from every journey page. */
export const breadcrumbs = (title) => [
  { text: 'Prototypes', href: '/prototype-standalone' },
  { text: 'Obligations (standalone)', href: BASE },
  { text: 'Your application', href: hubPath() },
  { text: title }
]
