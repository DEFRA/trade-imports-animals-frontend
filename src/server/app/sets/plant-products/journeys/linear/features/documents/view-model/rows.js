import { documentTypeLabel } from '../../../../../services/reference/document-types.js'
import { removeActionValue } from '../contracts/remove-action.js'
import { statusState } from './fragments/status.js'
import { cellText, dateText } from './fragments/text.js'

const documentRow = ({ index, entry, scanStatus }) => {
  const documentType = cellText(
    documentTypeLabel(entry.documentType) ?? entry.documentType
  )
  const documentReference = cellText(entry.documentReference)
  return {
    documentType,
    documentReference,
    issueDate: dateText(entry.issueDate),
    status: statusState(scanStatus),
    removeAction: removeActionValue(index),
    removeHidden: `${documentType} ${documentReference}`
  }
}

export const documentRows = (documents) => documents.map(documentRow)
