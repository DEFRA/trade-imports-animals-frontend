import {
  hiddenActionsHeading,
  removeActionCell
} from '../../../../../../../../common/constants/table-cells.js'
import { removeActionFor } from './remove-action.js'

/** The table rows of the added countries, each with its Remove action. */
export const countryRows = (labelled) =>
  labelled.map(({ code, label }) => ({
    code,
    name: label,
    removeAction: removeActionFor(code)
  }))

export const countriesTable = (rows, copy) => ({
  head: [
    { text: copy.table.country },
    hiddenActionsHeading(copy.table.actionsHidden)
  ],
  rows: rows.map((row) => [
    { text: row.name },
    removeActionCell({
      action: row.removeAction,
      text: copy.remove,
      hiddenText: copy.removeHidden(row.name)
    })
  ])
})
