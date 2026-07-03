/**
 * Shell identity for the v2 spike. BASE is the mount path the shared
 * Playwright specs walk (one JOURNEYS entry, grouped path). Templates
 * resolve from the prototypes/ Nunjucks root, so a view name is the
 * spike-relative path under `standalone/obligations-v2-spike/`.
 */
export const BASE =
  '/prototype-standalone/obligations-v2-spike/task-list-with-linear-tasks'

export const TEMPLATES = 'standalone/obligations-v2-spike'
export const LAYOUT = `${TEMPLATES}/pages/_shared/layout.njk`

/** Page URL from a flow slug (slugs may nest, e.g. addons/…/who). */
export const pagePath = (slug) => `${BASE}/${slug}`
export const hubPath = () => `${BASE}/hub`
export const startPath = () => `${BASE}/start`

/** Breadcrumbs keep the hub reachable from every journey page. */
export const breadcrumbs = (title) => [
  { text: 'Prototypes', href: '/prototype-standalone' },
  { text: 'Obligations v2 (standalone)', href: BASE },
  { text: 'Your application', href: hubPath() },
  { text: title }
]
