import {
  APPROVED,
  NEW
} from '../../../../../../../services/transporters/index.js'
import { addressSummary } from './transporter-record.js'
import { copyFor } from '../../../../../../../shared/copy.js'
import { containsTerm } from '../../../../../../../../../client/common/helpers/search-fold.js'
import { copy as en } from '../copy/copy.en.js'
import { copy as cy } from '../copy/copy.cy.js'

const copy = copyFor({ en, cy }).transporters

const STATUS_CLASSES = {
  [APPROVED]: 'govuk-tag--green',
  [NEW]: 'govuk-tag--magenta'
}

const searchTextOf = (record) =>
  [
    record.name,
    addressSummary(record.address),
    record.approvalNumber,
    copy.types[record.type],
    copy.statuses[record.status]
  ]
    .filter(Boolean)
    .join(' ')

export const shownCountMessages = (rowCount) =>
  Array.from({ length: rowCount }, (_, index) => copy.shownCount(index + 1))

/** The transporters a search term leaves on the list.
 *
 * An empty term leaves the whole list. */
export const matchingTransporters = (records, query = '') =>
  records.filter((record) => containsTerm(searchTextOf(record), query))

/** One table row per transporter, with the radio that picks it. */
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
    searchText: searchTextOf(record),
    checked: record.id === selectedId
  }))
