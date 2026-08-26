export const BASE = ''

export const pagePath = (journeyId, slug) =>
  `${BASE}/notifications/${journeyId}/${slug}`
export const pageRoutePath = (slug) =>
  `${BASE}/notifications/{journeyId}/${slug}`
export const hubPath = (journeyId) => `${BASE}/notifications/${journeyId}`
export const hubRoutePath = () => `${BASE}/notifications/{journeyId}`
export const createPath = () => `${BASE}/notifications`
export const dashboardPath = () => '/'

export const inDashboardSection = (path) =>
  path === dashboardPath() ||
  path === createPath() ||
  path.startsWith(`${createPath()}/`)

export const breadcrumbs = (_journeyId, title) => [
  { text: 'Your notifications', href: dashboardPath() },
  { text: title }
]
