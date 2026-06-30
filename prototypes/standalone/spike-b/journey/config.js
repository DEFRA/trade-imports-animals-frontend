/**
 * Journey constants and the hardcoded shape for the one journey spike-b ships:
 * a hub of three tasks, each a short linear run of steps. (In the original this
 * was one entry in a shared SHAPES registry.) The model itself still lives in
 * model/machine.json and is interpreted by runtime/ (the `contract`); this is
 * only the shell's routing/status configuration.
 */

export const BASE = '/prototype-standalone/spike-b/task-list-with-linear-tasks'
export const LAYOUT = 'standalone/spike-b/templates/layout.njk'
export const TEMPLATES = 'standalone/spike-b/templates'

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
