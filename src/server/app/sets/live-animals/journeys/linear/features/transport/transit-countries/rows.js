import { escapeHtml } from '../../documents/view-model/fragments/text.js'
import { removeActionFor } from './remove-action.js'

/** The table rows of the added countries, each with its Remove action. */
export const countryRows = (labelled) =>
  labelled.map(({ code, label }) => ({
    code,
    name: label,
    removeAction: removeActionFor(code)
  }))

const removeButton = (row, copy) =>
  `<button type="submit" class="govuk-link app-link-button" name="action" value="${escapeHtml(row.removeAction)}">${escapeHtml(copy.remove)}<span class="govuk-visually-hidden"> ${escapeHtml(copy.removeHidden(row.name))}</span></button>`

export const countriesTable = (rows, copy) => ({
  head: [
    { text: copy.table.country },
    {
      html: `<span class="govuk-visually-hidden">${escapeHtml(copy.table.actionsHidden)}</span>`
    }
  ],
  rows: rows.map((row) => [
    { text: row.name },
    { html: removeButton(row, copy), classes: 'govuk-!-text-align-right' }
  ])
})
