import { escapeHtml } from '../../app/shared/escape-html.js'

export const BREAK_ANYWHERE_CELL = 'app-table__cell--break-anywhere'

export const wrappingCell = (content) => ({
  ...content,
  classes: BREAK_ANYWHERE_CELL
})

export const visuallyHiddenText = (text) =>
  `<span class="govuk-visually-hidden">${escapeHtml(text)}</span>`

export const actionsCell = (html) => ({
  html,
  classes: 'govuk-!-text-align-right'
})

export const hiddenActionsHeading = (text) => ({
  html: visuallyHiddenText(text)
})

export const removeActionCell = ({ action, text, hiddenText }) => {
  const hiddenName = visuallyHiddenText(` ${hiddenText}`)
  return actionsCell(
    `<button type="submit" class="govuk-link app-link-button" name="action" value="${escapeHtml(action)}">${escapeHtml(text)}${hiddenName}</button>`
  )
}
