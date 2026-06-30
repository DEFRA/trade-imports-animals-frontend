/**
 * Journey static identity for the one shape spike C ships: the base mount path,
 * the layout and templates roots, and the literal task-group shape. There is no
 * generic variant builder and no shape registry — the groups are spelled out
 * here so the journey reads end to end without leaving spike-c/.
 */

export const BASE = '/prototype-standalone/spike-c/task-list-with-linear-tasks'
export const LAYOUT = 'standalone/spike-c/templates/layout.njk'
export const TEMPLATES = 'standalone/spike-c/templates'

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
