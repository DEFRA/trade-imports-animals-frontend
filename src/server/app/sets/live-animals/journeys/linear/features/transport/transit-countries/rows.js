import { removeActionFor } from './remove-action.js'

/** One row per country the trader has added, in the order they added them, each
 * with its own Remove control. The list read back is the
 * whole record of the answer, so it names the country rather than its code. */
export const countryRows = (labelled) =>
  labelled.map(({ code, label }) => ({
    code,
    name: label,
    removeAction: removeActionFor(code)
  }))
