import { escapeHtml } from '../app/shared/escape-html.js'

export const visuallyHiddenText = (text) =>
  `<span class="govuk-visually-hidden">${escapeHtml(text)}</span>`
