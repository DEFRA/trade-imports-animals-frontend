import { escapeHtml } from '../../app/shared/escape-html.js'
import { visuallyHiddenText } from '../constants/table-cells.js'

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
