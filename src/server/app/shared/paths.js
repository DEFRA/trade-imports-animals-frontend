import { currentSetBase } from './set-context.js'

export const setBase = () => currentSetBase()

// Route shapes are prefix-free because Hapi supplies the set mount prefix.
// They are evaluated at module load, when controllers build their route tables.
export const pageRoutePath = (slug) => `/notifications/{journeyId}/${slug}`
export const hubRoutePath = () => '/notifications/{journeyId}'
export const createRoutePath = () => '/notifications'
export const dashboardRoutePath = () => '/'

// Links carry the prefix, resolved inside the active request's set context.
// Using a route builder where a link belongs drops the prefix, and the reverse
// doubles it; with no set at the root both fail on the first request.
export const pagePath = (journeyId, slug) =>
  `${setBase()}/notifications/${journeyId}/${slug}`
export const hubPath = (journeyId) => `${setBase()}/notifications/${journeyId}`
export const createPath = () => `${setBase()}/notifications`
export const dashboardPath = () => setBase()

export const inDashboardSection = (path) =>
  path === dashboardPath() ||
  path === createPath() ||
  path.startsWith(`${createPath()}/`)
