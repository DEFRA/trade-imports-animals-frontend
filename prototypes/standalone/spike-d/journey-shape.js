/**
 * Spike D — the journey shape and its path/breadcrumb builders. The journey is a
 * task list whose tasks are short linear runs; the groups are a literal here and
 * navigation is spelled out directly over them (no generic variant builder, no
 * shape registry). The model itself still lives in model/ and is interpreted by
 * runtime/ (the `contract`); this module only describes the shell's shape.
 */

export const BASE = '/prototype-standalone/spike-d/task-list-with-linear-tasks'
export const LAYOUT = 'standalone/spike-d/templates/layout.njk'

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
    { text: 'Spike D (standalone)', href: BASE },
    { text: 'Your application', href: hubPath(quote.id) },
    { text: title }
  ]
}
