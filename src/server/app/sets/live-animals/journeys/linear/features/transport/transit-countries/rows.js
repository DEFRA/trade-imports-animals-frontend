import { removeActionFor } from './remove-action.js'

/** One row per country the trader has added, in the order they added them, each
 * with its own Remove control. */
export const countryRows = (labelled) =>
  labelled.map(({ code, label }) => ({
    code,
    name: label,
    removeAction: removeActionFor(code)
  }))
