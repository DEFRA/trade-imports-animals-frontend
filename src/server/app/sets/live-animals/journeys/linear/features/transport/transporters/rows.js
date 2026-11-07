import {
  APPROVED,
  NEW
} from '../../../../../../../services/transporters/index.js'
import { addressSummary } from './transporter-record.js'
import { copyFor } from '../../../../../../../shared/copy.js'
import { containsTerm } from '../../../../../../../../../client/common/helpers/search-fold.js'
import { renderMacro } from '../../../../../../../shared/render-macro.js'
import { copy as en } from '../copy/copy.en.js'
import { copy as cy } from '../copy/copy.cy.js'
import { copy as sharedEn } from '../../../../../../../shared/copy.en.js'
import { copy as sharedCy } from '../../../../../../../shared/copy.cy.js'

const copy = copyFor({ en, cy }).transporters
const sharedCopy = copyFor({ en: sharedEn, cy: sharedCy })

const STATUS_CLASSES = {
  [APPROVED]: 'govuk-tag--green',
  [NEW]: 'govuk-tag--magenta'
}

const approvalNumberTextOf = (record) =>
  record.approvalNumber ?? sharedCopy.notApplicable

const searchTextOf = (record) =>
  [
    record.name,
    addressSummary(record.address),
    approvalNumberTextOf(record),
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
    approvalNumberText: approvalNumberTextOf(record),
    type: copy.types[record.type],
    status: {
      text: copy.statuses[record.status],
      classes: STATUS_CLASSES[record.status]
    },
    searchText: searchTextOf(record),
    checked: record.id === selectedId
  }))

const CELLS_TEMPLATE =
  'live-animals/journeys/linear/features/transport/transporters/_cells.njk'

/** One table row of cells per transporter row, searchable by its search text. */
export const transporterTableRows = (rows) =>
  rows.map((row) => [
    {
      html: renderMacro(CELLS_TEMPLATE, 'transporterSelectCell', row, copy),
      attributes: { 'data-search-text': row.searchText }
    },
    { text: row.name },
    { text: row.addressText },
    { text: row.approvalNumberText },
    { text: row.type },
    { html: renderMacro(CELLS_TEMPLATE, 'transporterStatusCell', row) }
  ])
