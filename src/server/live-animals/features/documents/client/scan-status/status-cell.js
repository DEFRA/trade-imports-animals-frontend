import { SCAN_STATUS } from '../../scan-poll.js'
import { createEl } from '../dom.js'
import { announce } from './announce.js'
import { pagePath } from './page.js'

const UNKNOWN_STATUS = 'UNKNOWN'

export const pendingCells = () =>
  document.querySelectorAll(
    `[data-upload-id][data-scan-status="${SCAN_STATUS.PENDING}"]`
  )

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

export const applyStatusUpdates = (documents, scanCopy) => {
  documents.forEach(({ uploadId, scanStatus }) => {
    const cell = document.querySelector(`[data-upload-id="${uploadId}"]`)
    if (cell && cell.dataset.scanStatus !== scanStatus) {
      applyStatus(cell, uploadId, scanStatus, scanCopy)
    }
  })
}
