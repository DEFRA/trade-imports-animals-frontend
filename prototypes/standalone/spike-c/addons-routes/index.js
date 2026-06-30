import { BASE } from '../journey/index.js'
import {
  withQuote,
  withStep,
  getAddonsSelection,
  postAddonsSelection,
  getAddonStep,
  postAddonStep
} from './handlers.js'

/**
 * "Add to your policy" — pick 0..N add-ons (checkboxes); each chosen add-on then
 * has its own short sub-journey of steps. In this task-list journey each add-on
 * is its own task that returns to the hub when finished. URL scheme:
 *   {base}/{id}/addons                    pick add-ons
 *   {base}/{id}/addons/{addon}/{step}     one step of a chosen add-on
 */
export function addonsRoutes() {
  const open = { auth: false }
  return [
    {
      method: 'GET',
      path: `${BASE}/{id}/addons`,
      options: open,
      handler: withQuote(getAddonsSelection)
    },
    {
      method: 'POST',
      path: `${BASE}/{id}/addons`,
      options: open,
      handler: withQuote(postAddonsSelection)
    },
    {
      method: 'GET',
      path: `${BASE}/{id}/addons/{addon}/{step}`,
      options: open,
      handler: withStep(getAddonStep)
    },
    {
      method: 'POST',
      path: `${BASE}/{id}/addons/{addon}/{step}`,
      options: open,
      handler: withStep(postAddonStep)
    }
  ]
}
