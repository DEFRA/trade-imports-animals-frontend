import { isBlank } from '../../../../../../../../../lib/answered.js'
import { copyFor } from '../../../../../../../../../shared/copy.js'
import { copy as en } from '../../../copy/copy.en.js'
import { copy as cy } from '../../../copy/copy.cy.js'
import { transportersPage } from '../../../../transport/page.js'
import { addressLines } from '../../rows/party-row.js'
import { cardAction, editableActions } from '../../rows/change-link.js'
import { row } from '../../rows/summary-row.js'
import { escapeHtml } from '../../rows/value-text.js'

const copy = copyFor({ en, cy })

const NOT_PROVIDED = copy.notProvided

export const activeTransporter = (answers, scope) => {
  if (scope.has('commercialTransporter')) {
    return answers.commercialTransporter
  }
  if (scope.has('privateTransporter')) {
    return answers.privateTransporter
  }
  return null
}

export const transporterAddressRow = (party) => {
  const lines = addressLines(party?.address).map(escapeHtml)
  return {
    key: { text: copy.rows.address },
    value: lines.length ? { html: lines.join('<br>') } : { text: NOT_PROVIDED }
  }
}

export const approvalNumberRow = (transporter) =>
  isBlank(transporter?.approvalNumber)
    ? []
    : [row(copy.rows.approvalNumber, transporter.approvalNumber)]

export const activeTransporterRows = (transporter) =>
  transporter
    ? [
        row(copy.rows.name, transporter.name),
        transporterAddressRow(transporter),
        row(copy.rows.country, transporter.address?.country),
        ...approvalNumberRow(transporter)
      ]
    : []

export const transportDetailsCard = (journeyId, answers, scope, readOnly) => {
  const transporter = activeTransporter(answers, scope)
  return {
    id: 'transportDetails',
    title: copy.cards.transportDetails,
    ...editableActions(
      readOnly,
      cardAction(
        journeyId,
        transportersPage.slug,
        copy.hidden.cards.transportDetails
      )
    ),
    rows: [
      ...activeTransporterRows(transporter),
      row(copy.rows.type, answers.transporterType)
    ]
  }
}
