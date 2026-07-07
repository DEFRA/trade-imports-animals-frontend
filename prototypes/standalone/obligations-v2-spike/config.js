// BASE is the mount path the SHARED Playwright specs walk — changing it
// breaks E2E outside this folder. View names resolve from the prototypes/
// Nunjucks root, so a template name is the spike-relative path.
export const BASE =
  '/prototype-standalone/obligations-v2-spike/task-list-with-linear-tasks'

export const TEMPLATES = 'standalone/obligations-v2-spike'
export const LAYOUT = `${TEMPLATES}/shared/layout.njk`

export const pagePath = (slug) => `${BASE}/${slug}`
export const hubPath = () => `${BASE}/hub`
export const startPath = () => `${BASE}/start`

export const breadcrumbs = (title) => [
  { text: 'Prototypes', href: '/prototype-standalone' },
  { text: 'Obligations v2 (standalone)', href: BASE },
  { text: 'Your application', href: hubPath() },
  { text: title }
]
