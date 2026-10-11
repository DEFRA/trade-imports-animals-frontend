import { currentSetBase } from './set-context.js'
import { inTemplateMode } from './template-mode.js'

export const setBase = () => currentSetBase()

// Route shapes are prefix-free because Hapi supplies the set mount prefix.
// They are evaluated at module load, when controllers build their route tables.
export const pageRoutePath = (slug) => `/notifications/{journeyId}/${slug}`
export const hubRoutePath = () => '/notifications/{journeyId}'
export const createRoutePath = () => '/notifications'
export const startRoutePath = () => '/start'
export const dashboardRoutePath = () => '/'
export const templatesRoutePath = () => '/templates'
export const newTemplateRoutePath = () => '/templates/new'
export const templateNameRoutePath = () => '/templates/{journeyId}/name'

// Links carry the prefix, resolved inside the active request's set context.
// Using a route builder where a link belongs drops the prefix, and the reverse
// doubles it; with no set at the root both fail on the first request.
//
// In template mode the same builders point at the template's own paths, so a
// journey page's links keep the run inside template mode.
export const pagePath = (journeyId, slug) =>
  inTemplateMode()
    ? `${setBase()}/templates/${journeyId}/${slug}`
    : `${setBase()}/notifications/${journeyId}/${slug}`
export const hubPath = (journeyId) =>
  inTemplateMode()
    ? `${setBase()}/templates/${journeyId}`
    : `${setBase()}/notifications/${journeyId}`
export const createPath = () => `${setBase()}/notifications`
export const startPath = () => `${setBase()}/start`
export const dashboardPath = () => setBase()
export const templatesPath = () => `${setBase()}/templates`
export const newTemplatePath = () => `${setBase()}/templates/new`
export const templateNamePath = (templateId) =>
  `${setBase()}/templates/${templateId}/name`
export const templatePath = (templateId) =>
  `${setBase()}/templates/${templateId}`
export const templatePagePath = (templateId, slug) =>
  `${setBase()}/templates/${templateId}/${slug}`

export const inDashboardSection = (path) =>
  path === dashboardPath() ||
  path === createPath() ||
  path.startsWith(`${createPath()}/`)

export const inTemplatesSection = (path) =>
  path === templatesPath() || path.startsWith(`${templatesPath()}/`)
