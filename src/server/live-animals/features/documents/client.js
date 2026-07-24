import { ErrorSummary } from 'govuk-frontend'

import { exceedsMaxFileSize } from './upload-config.js'
import {
  POLL_ACTION,
  POLL_INTERVAL_MS,
  SCAN_STATUS,
  pollDecision
} from './scan-poll.js'

const pagePath = () => window.location.pathname
const STATUS_ENDPOINT = `${pagePath()}/status`

const CLIENT_ERROR_MARKER = 'file-size'
const ARIA_DESCRIBEDBY = 'aria-describedby'
const UNKNOWN_STATUS = 'UNKNOWN'

const createEl = (
  tag,
  { className, text, attrs = {}, dataset, children = [] } = {}
) => {
  const el = document.createElement(tag)
  if (className) {
    el.className = className
  }
  if (text != null) {
    el.textContent = text
  }
  if (dataset) {
    Object.assign(el.dataset, dataset)
  }
  for (const [key, value] of Object.entries(attrs)) {
    el.setAttribute(key, value)
  }
  children.forEach((child) => el.appendChild(child))
  return el
}

const announcer = () => document.getElementById('js-scan-status-announcer')

const pendingCells = () =>
  document.querySelectorAll(
    `[data-upload-id][data-scan-status="${SCAN_STATUS.PENDING}"]`
  )

const readScanCopy = () => {
  const raw = announcer()?.dataset.scanCopy
  return raw ? JSON.parse(raw) : {}
}

const announce = (message) => {
  const region = announcer()
  if (region && message) {
    region.textContent = message
  }
}

const filePath = (uploadId) => `${pagePath()}/${uploadId}/file`

const actionsCellOf = (statusCell) =>
  statusCell.closest('tr')?.querySelector('[data-view-file-text]')

const viewFileLink = (actionsCell, uploadId) =>
  createEl('a', {
    className: 'govuk-link govuk-!-margin-right-3',
    text: actionsCell.dataset.viewFileText,
    attrs: { href: filePath(uploadId) },
    children: [
      createEl('span', {
        className: 'govuk-visually-hidden',
        text: ` ${actionsCell.dataset.viewFileHidden}`
      })
    ]
  })

const applyActions = (statusCell, uploadId, scanStatus) => {
  const actionsCell = actionsCellOf(statusCell)
  const removeButton = actionsCell?.querySelector(
    'button[name="action"][value^="remove:"]'
  )
  if (!actionsCell || !removeButton) {
    return
  }
  actionsCell.replaceChildren()
  if (scanStatus === SCAN_STATUS.COMPLETE) {
    actionsCell.appendChild(viewFileLink(actionsCell, uploadId))
  }
  actionsCell.appendChild(removeButton)
}

const applyStatus = (cell, uploadId, scanStatus, scanCopy) => {
  cell.dataset.scanStatus = scanStatus
  applyActions(cell, uploadId, scanStatus)
  const presentation = scanCopy[scanStatus] ?? scanCopy[UNKNOWN_STATUS]
  const tag = cell.querySelector('.govuk-tag')
  if (!tag || !presentation) {
    return
  }
  tag.textContent = presentation.text
  tag.className = `govuk-tag ${presentation.classes}`
  announce(presentation.announcement)
}

const applyStatusUpdates = (documents, scanCopy) => {
  documents.forEach(({ uploadId, scanStatus }) => {
    const cell = document.querySelector(`[data-upload-id="${uploadId}"]`)
    if (cell && cell.dataset.scanStatus !== scanStatus) {
      applyStatus(cell, uploadId, scanStatus, scanCopy)
    }
  })
}

const readStatuses = async () => {
  try {
    const response = await fetch(STATUS_ENDPOINT, {
      headers: { Accept: 'application/json' }
    })
    if (!response.ok) {
      return null
    }
    const { documents } = await response.json()
    return documents ?? null
  } catch {
    return null
  }
}

// The server already renders the hint; polling only unhides it.
const showTimedOutHint = () => {
  const hint = document.getElementById('js-timeout-message')
  if (hint) {
    hint.hidden = false
  }
}

// A settled scan changes the Continue state and may add virus errors, so
// re-render from the server. The page is also reachable by POST (a blocked
// Continue), so navigate to its GET href rather than reloading.
const goToSettledPage = () => {
  const href = announcer()?.dataset.settledHref
  if (href) {
    globalThis.location.replace(href)
  }
}

const pollScanStatus = async (attempt, scanCopy) => {
  const documents = await readStatuses()
  if (documents) {
    applyStatusUpdates(documents, scanCopy)
  }
  const decision = pollDecision({ attempt, documents })
  if (decision.action === POLL_ACTION.settled) {
    goToSettledPage()
  } else if (decision.action === POLL_ACTION.giveUp) {
    showTimedOutHint()
  } else {
    setTimeout(
      () => pollScanStatus(decision.attempt, scanCopy),
      decision.delayMs
    )
  }
}

const hideRefreshFallback = () => {
  const fallback = document.getElementById('js-refresh-fallback')
  if (fallback) {
    fallback.hidden = true
  }
}

const startPolling = () => {
  if (pendingCells().length === 0) {
    return
  }
  hideRefreshFallback()
  const scanCopy = readScanCopy()
  setTimeout(() => pollScanStatus(0, scanCopy), POLL_INTERVAL_MS)
}

const clientErrorSelector = (suffix) =>
  `[data-client-error="${CLIENT_ERROR_MARKER}-${suffix}"]`

const restoreInputState = (input) => {
  input.classList.remove('govuk-file-upload--error')
  const previous = input.dataset.clientErrorPrevDescribedby ?? ''
  if (previous) {
    input.setAttribute(ARIA_DESCRIBEDBY, previous)
  } else {
    input.removeAttribute(ARIA_DESCRIBEDBY)
  }
  delete input.dataset.clientError
  delete input.dataset.clientErrorPrevDescribedby
}

const clearGroupError = (group) => {
  group.classList.remove('govuk-form-group--error')
  delete group.dataset.clientError
}

const clearPreviousClientErrors = (form) => {
  document
    .querySelectorAll(clientErrorSelector('summary'))
    .forEach((summary) => summary.remove())
  form
    .querySelectorAll(clientErrorSelector('message'))
    .forEach((message) => message.remove())
  form.querySelectorAll(clientErrorSelector('group')).forEach(clearGroupError)
  form.querySelectorAll(clientErrorSelector('input')).forEach(restoreInputState)
}

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
const getOrCreateSummary = (container, message, targetId) => {
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

const buildErrorMessageEl = (id, message, hiddenPrefix) => {
  const errorMessage = createEl('p', {
    attrs: { id },
    className: 'govuk-error-message',
    dataset: { clientError: `${CLIENT_ERROR_MARKER}-message` },
    children: [
      createEl('span', {
        className: 'govuk-visually-hidden',
        text: hiddenPrefix
      })
    ]
  })
  errorMessage.appendChild(document.createTextNode(` ${message}`))
  return errorMessage
}

// Strip the error id token: any server-rendered error element with the same
// id was removed above, so keeping the token would duplicate the join and
// leave a dangling idref once the client error clears.
const applyInputErrorState = (input, errorId) => {
  const previousDescribedby = (input.getAttribute(ARIA_DESCRIBEDBY) ?? '')
    .split(/\s+/)
    .filter((token) => token && token !== errorId)
    .join(' ')
  input.dataset.clientErrorPrevDescribedby = previousDescribedby
  input.dataset.clientError = `${CLIENT_ERROR_MARKER}-input`
  input.setAttribute(
    ARIA_DESCRIBEDBY,
    [previousDescribedby, errorId].filter(Boolean).join(' ')
  )
  input.classList.add('govuk-file-upload--error')
}

const renderFieldError = (input, message, hiddenPrefix) => {
  const group = input.closest('.govuk-form-group')
  if (!group) {
    return
  }
  group.classList.add('govuk-form-group--error')
  group.dataset.clientError = `${CLIENT_ERROR_MARKER}-group`
  group.querySelector(`#${input.id}-error`)?.remove()
  const errorMessage = buildErrorMessageEl(
    `${input.id}-error`,
    message,
    hiddenPrefix
  )
  input.parentNode.insertBefore(errorMessage, input)
  applyInputErrorState(input, errorMessage.id)
}

const focusSummaryTitle = (summary) => {
  const title = summary.querySelector('.govuk-error-summary__title')
  if (title) {
    title.tabIndex = -1
    title.focus()
  }
}

const onUploadSubmit = (form, container, maxFileSize) => (event) => {
  clearPreviousClientErrors(form)
  const fileInput = form.querySelector('input[type="file"]')
  const file = fileInput?.files?.[0]
  if (!file || !exceedsMaxFileSize(file.size, maxFileSize)) {
    return
  }
  event.preventDefault()
  const message = form.dataset.oversizeError
  const summary = getOrCreateSummary(container, message, fileInput.id)
  renderFieldError(fileInput, message, container.dataset.errorPrefix)
  focusSummaryTitle(summary)
}

const initUploadForm = () => {
  const form = document.querySelector('form[data-max-file-size]')
  const container = document.getElementById('js-error-summary-container')
  if (!form || !container || !form.dataset.oversizeError) {
    return
  }
  const maxFileSize = Number.parseInt(form.dataset.maxFileSize, 10)
  if (!Number.isFinite(maxFileSize) || maxFileSize <= 0) {
    return
  }
  form.addEventListener('submit', onUploadSubmit(form, container, maxFileSize))
}

startPolling()
initUploadForm()
