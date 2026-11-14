import { copyFor } from '../../../../../../../../../shared/copy.js'
import { copy as en } from '../../../copy/copy.en.js'
import { copy as cy } from '../../../copy/copy.cy.js'
import { transportersPage } from '../../../../transport/page.js'
import { addressLines } from '../../rows/party-row.js'
import { changeAction, editableActions } from '../../rows/change-link.js'
import { row } from '../../rows/summary-row.js'
import { escapeHtml } from '../../../../../../../../../../../shared/escape-html.js'
import { notApplicableCell } from '../../rows/value-text.js'

const copy = copyFor({ en, cy })

const activeTransporter = (answers, scope) => {
  if (scope.has('commercialTransporter')) {
    return answers.commercialTransporter
  }
  if (scope.has('privateTransporter')) {
    return answers.privateTransporter
  }
  return null
}

const transporterAddressRow = (transporter) => {
  const lines = addressLines(transporter?.address).map(escapeHtml)
  return {
    key: { text: copy.rows.address },
    value: lines.length ? { html: lines.join('<br>') } : notApplicableCell()
  }
}

const transporterRows = (transporter) => [
  row(copy.rows.name, transporter?.name),
  transporterAddressRow(transporter),
  row(copy.rows.country, transporter?.address?.country),
  row(copy.rows.approvalNumber, transporter?.approvalNumber)
]

export const transportDetailsCard = ({
  journeyId,
  changeLinkTrail,
  answers,
  scope,
  readOnly
}) => ({
  id: 'transportDetails',
  title: copy.cards.transportDetails,
  ...editableActions({
    readOnly,
    actions: changeAction(
      { journeyId, changeLinkTrail },
      transportersPage.slug,
      copy.hidden.cards.transportDetails
    )
  }),
  rows: [
    ...transporterRows(activeTransporter(answers, scope)),
    row(copy.rows.type, answers.transporterType)
  ]
})
