import { currentSetBase } from './set-context.js'

export const setBase = () => currentSetBase()

export const pageRoutePath = (slug) => `/notifications/{journeyId}/${slug}`
export const hubRoutePath = () => '/notifications/{journeyId}'
export const createRoutePath = () => '/notifications'
export const startRoutePath = () => '/start'
export const dashboardRoutePath = () => '/'

export const pagePath = (journeyId, slug) =>
  `${setBase()}/notifications/${journeyId}/${slug}`
export const hubPath = (journeyId) => `${setBase()}/notifications/${journeyId}`
export const createPath = () => `${setBase()}/notifications`
export const dashboardPath = () => setBase()

export const inDashboardSection = (path) =>
  path === dashboardPath() ||
  path === createPath() ||
  path.startsWith(`${createPath()}/`)
