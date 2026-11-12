import { escapeHtml } from '../../client/common/helpers/escape-html.js'

export const visuallyHiddenText = (text) =>
  `<span class="govuk-visually-hidden">${escapeHtml(text)}</span>`
