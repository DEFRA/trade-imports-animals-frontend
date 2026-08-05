import { isBlank } from '../../../../../../../../../lib/answered.js'
import { copyFor } from '../../../../../../../../../shared/copy.js'
import { copy as en } from '../../../copy/copy.en.js'
import { copy as cy } from '../../../copy/copy.cy.js'
import { addressLines } from '../../rows/party-row.js'
import { changeAction, editableActions } from '../../rows/change-link.js'
import { row } from '../../rows/summary-row.js'
import { escapeHtml } from '../../rows/value-text.js'

const copy = copyFor({ en, cy })

const NOT_PROVIDED = copy.notProvided

export const activeTransporter = (answers, scope) => {
  if (scope.has('commercialTransporter')) {
    return {
      party: answers.commercialTransporter,
      id: 'commercialTransporter'
    }
  }
  if (scope.has('privateTransporter')) {
    return { party: answers.privateTransporter, id: 'privateTransporter' }
  }
  return null
}

export const transporterAddressRow = (journeyId, party, id, readOnly) => {
  const lines = addressLines(party?.address).map(escapeHtml)
  return {
    key: { text: copy.rows.address },
    value: lines.length ? { html: lines.join('<br>') } : { text: NOT_PROVIDED },
    ...editableActions(
      readOnly,
      changeAction(journeyId, id, copy.hidden.transporterAddress)
    )
  }
}

export const approvalNumberRow = (journeyId, active, readOnly) =>
  isBlank(active.party?.approvalNumber)
    ? []
    : [
        row(
          journeyId,
          readOnly,
          copy.rows.approvalNumber,
          active.party.approvalNumber,
          active.id,
          copy.hidden.transporterApprovalNumber
        )
      ]

export const activeTransporterRows = (journeyId, active, readOnly) =>
  active
    ? [
        row(
          journeyId,
          readOnly,
          copy.rows.name,
          active.party?.name,
          active.id,
          copy.hidden.transporterName
        ),
        transporterAddressRow(journeyId, active.party, active.id, readOnly),
        row(
          journeyId,
          readOnly,
          copy.rows.country,
          active.party?.address?.country,
          active.id,
          copy.hidden.transporterCountry
        ),
        ...approvalNumberRow(journeyId, active, readOnly)
      ]
    : []

export const transportDetailsCard = (journeyId, answers, scope, readOnly) => {
  const active = activeTransporter(answers, scope)
  return {
    title: copy.cards.transportDetails,
    rows: [
      ...activeTransporterRows(journeyId, active, readOnly),
      row(
        journeyId,
        readOnly,
        copy.rows.type,
        answers.transporterType,
        'transporterType',
        copy.hidden.transporterType
      )
    ]
  }
}
