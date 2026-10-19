import {
  APPROVED,
  NEW
} from '../../../../../../../services/transporters/index.js'
import { addressSummary } from './transporter-record.js'
import { copyFor } from '../../../../../../../shared/copy.js'
import { copy as en } from '../copy/copy.en.js'
import { copy as cy } from '../copy/copy.cy.js'

const copy = copyFor({ en, cy }).transporters

const STATUS_CLASSES = {
  [APPROVED]: 'govuk-tag--green',
  [NEW]: 'govuk-tag--magenta'
}

const foldForSearch = (text) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()

const searchableText = (record) =>
  foldForSearch(
    [
      record.name,
      addressSummary(record.address),
      record.approvalNumber ?? ''
    ].join(' ')
  )

/** The transporters a search term leaves on the list.
 *
 * An empty term leaves the whole list. */
export const matchingTransporters = (records, query = '') => {
  const term = foldForSearch(query.trim())
  return term
    ? records.filter((record) => searchableText(record).includes(term))
    : records
}

/** One table row per transporter, with the radio that picks it. The first
 * radio takes the field's own id, so the error summary links to it. */
export const transporterRows = (records, { selectedId }) =>
  records.map((record, index) => ({
    id: record.id,
    idPrefix: index === 0 ? 'transporter' : `transporter-${index + 1}`,
    name: record.name,
    addressText: addressSummary(record.address),
    approvalNumber: record.approvalNumber ?? '',
    type: copy.types[record.type],
    status: {
      text: copy.statuses[record.status],
      classes: STATUS_CLASSES[record.status]
    },
    checked: record.id === selectedId
  }))
