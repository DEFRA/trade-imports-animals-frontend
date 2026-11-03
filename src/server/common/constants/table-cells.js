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

const trailingClass = (classes) => (classes ? ` ${classes}` : '')

export const removeActionButton = ({
  action,
  text,
  hiddenText,
  classes = ''
}) => {
  const buttonClasses = `govuk-link app-link-button${trailingClass(classes)}`
  const hiddenName = visuallyHiddenText(` ${hiddenText}`)
  return `<button type="submit" class="${buttonClasses}" name="action" value="${escapeHtml(action)}">${escapeHtml(text)}${hiddenName}</button>`
}

export const removeActionCell = ({ action, text, hiddenText }) =>
  actionsCell(removeActionButton({ action, text, hiddenText }))
