export const BASE = '/prototype-standalone/live-animals'

export const TEMPLATES = 'live-animals'
export const LAYOUT = `${TEMPLATES}/shared/layout.njk`

export const pagePath = (journeyId, slug) =>
  `${BASE}/notifications/${journeyId}/${slug}`
export const pageRoutePath = (slug) =>
  `${BASE}/notifications/{journeyId}/${slug}`
export const hubPath = (journeyId) => `${BASE}/notifications/${journeyId}`
export const hubRoutePath = () => `${BASE}/notifications/{journeyId}`
export const createPath = () => `${BASE}/notifications`

export const breadcrumbs = (journeyId, title) => [
  { text: 'Prototypes', href: '/prototype-standalone' },
  { text: 'Live animals (standalone)', href: BASE },
  { text: 'Your application', href: hubPath(journeyId) },
  { text: title }
]
