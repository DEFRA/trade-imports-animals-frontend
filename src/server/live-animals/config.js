export const BASE = '/prototype-standalone/live-animals'

export const TEMPLATES = 'live-animals'
export const LAYOUT = `${TEMPLATES}/shared/layout.njk`

export const pagePath = (slug) => `${BASE}/${slug}`
export const hubPath = () => `${BASE}/hub`
export const startPath = () => `${BASE}/start`

export const breadcrumbs = (title) => [
  { text: 'Prototypes', href: '/prototype-standalone' },
  { text: 'Live animals (standalone)', href: BASE },
  { text: 'Your application', href: hubPath() },
  { text: title }
]
