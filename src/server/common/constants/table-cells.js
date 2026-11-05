import { escapeHtml } from '../../app/shared/escape-html.js'
import { removeActionButton } from '../components/remove-action-button.js'

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

export const removeActionCell = ({ action, text, hiddenText }) =>
  actionsCell(removeActionButton({ action, text, hiddenText }))
