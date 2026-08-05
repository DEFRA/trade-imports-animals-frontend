import { currentSetBase } from './set-context.js'

export const setBase = () => currentSetBase()

// Route shapes are prefix-free because Hapi supplies the set mount prefix.
export const pageRoutePath = (slug) => `/notifications/{journeyId}/${slug}`
export const hubRoutePath = () => '/notifications/{journeyId}'
export const dashboardRoutePath = () => '/'
export const createRoutePath = () => '/notifications'

// Links are resolved inside the active request's set context.
export const pagePath = (journeyId, slug) =>
  `${setBase()}/notifications/${journeyId}/${slug}`
export const hubPath = (journeyId) => `${setBase()}/notifications/${journeyId}`
export const createPath = () => `${setBase()}/notifications`
export const dashboardPath = () => setBase()

export const breadcrumbs = (_journeyId, title) => [
  { text: 'Your notifications', href: dashboardPath() },
  { text: title }
]
