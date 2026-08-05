import { ErrorSummary } from 'govuk-frontend'

import { createEl } from '../dom.js'
import { CLIENT_ERROR_MARKER } from './markers.js'

const buildSummaryItem = (message, targetId) =>
  createEl('li', {
    dataset: { clientError: `${CLIENT_ERROR_MARKER}-summary` },
    children: [
      createEl('a', { attrs: { href: `#${targetId}` }, text: message })
    ]
  })

const buildErrorSummary = (title, message, targetId) => {
  const list = createEl('ul', {
    className: 'govuk-list govuk-error-summary__list',
    children: [buildSummaryItem(message, targetId)]
  })
  const heading = createEl('h2', {
    className: 'govuk-error-summary__title',
    text: title
  })
  heading.tabIndex = -1
  const alert = createEl('div', {
    attrs: { role: 'alert' },
    children: [
      heading,
      createEl('div', {
        className: 'govuk-error-summary__body',
        children: [list]
      })
    ]
  })
  return createEl('div', {
    className: 'govuk-error-summary',
    dataset: {
      module: 'govuk-error-summary',
      clientError: `${CLIENT_ERROR_MARKER}-summary`
    },
    children: [alert]
  })
}

// createAll(ErrorSummary) in application.js ran at page load, so a summary
// inserted after that is never initialised. Instantiate it directly so the
// summary link focuses the file input. Auto-focus stays off — focusing the
// title covers both the inserted and the appended-to path.
const initialiseErrorSummary = (summary) => {
  try {
    return new ErrorSummary(summary, { disableAutoFocus: true })
  } catch {
    return null
  }
}

// GDS allows one error summary per page. A server-rendered summary may
// already be on the page, so append to its list instead of adding a second.
export const getOrCreateSummary = (container, message, targetId) => {
  const existingList = document.querySelector(
    '.govuk-error-summary .govuk-error-summary__list'
  )
  if (existingList) {
    existingList.appendChild(buildSummaryItem(message, targetId))
    return existingList.closest('.govuk-error-summary')
  }
  const summary = buildErrorSummary(
    container.dataset.errorSummaryTitle,
    message,
    targetId
  )
  container.appendChild(summary)
  initialiseErrorSummary(summary)
  return summary
}
