/**
 * Spike A — standalone, flattened. The journey shell config for the one shape we
 * ship (a task list whose tasks are short linear runs): base path, layout, the
 * literal task groups, and the URL builders over them. There is no generic
 * variant builder and no shape registry — the groups are a literal below.
 *
 * The model itself still lives in model/journey.json and is interpreted by
 * runtime/ (the `contract`); this config only describes the journey shell.
 */
export { addonByValue } from '../lib/addons.js'

export const BASE = '/prototype-standalone/spike-a/task-list-with-linear-tasks'
export const LAYOUT = 'standalone/spike-a/templates/layout.njk'

// The journey shape, hardcoded: a hub of three tasks, each a short linear run of
// steps. (In the original this was one entry in a shared SHAPES registry.)
export const grouped = {
  kind: 'grouped',
  groups: [
    { title: 'Email', stepIds: ['email'] },
    {
      title: 'About you and your vehicle',
      stepIds: ['about-you', 'your-vehicle']
    },
    {
      title: 'Your driving and cover',
      stepIds: ['driving-history', 'claims', 'cover-type', 'optional-extras']
    }
  ]
}

export const hubPath = (id) => `${BASE}/${id}`
export const addonStepPath = (id, value, stepSlug) =>
  `${BASE}/${id}/addons/${value}/${stepSlug}`

export function breadcrumbs(quote, title) {
  return [
    { text: 'Prototypes', href: '/prototype-standalone' },
    { text: 'Spike A (standalone)', href: BASE },
    { text: 'Your application', href: hubPath(quote.id) },
    { text: title }
  ]
}
