import {
  APPROVED,
  NEW
} from '../../../../../../../services/transporters/index.js'
import { addressSummary } from './transporter-record.js'
import { copyFor } from '../../../../../../../shared/copy.js'
import { copy as en } from '../copy/copy.en.js'
import { copy as cy } from '../copy/copy.cy.js'

const copy = copyFor({ en, cy }).transporters

/** The tag colour each approval status wears.
 *
 * Colour is presentation, not copy, so it lives beside the view model the way
 * the hub's task tags and the document rows' scan tags do. Design release 1
 * tags an approved transporter green and a newly added one pink, which
 * govuk-frontend 6 spells `govuk-tag--magenta`; the older `govuk-tag--pink`
 * renders the same colours but is deprecated for it. */
const STATUS_CLASSES = {
  [APPROVED]: 'govuk-tag--green',
  [NEW]: 'govuk-tag--magenta'
}

/** One table row per transporter — the facts Design release 1 aligns into
 * columns, plus the radio that picks the row.
 *
 * `idPrefix` gives the FIRST radio the field's own id, so the error summary
 * link lands on it; the rest are numbered from two, as the address picker's
 * results table does it. A private transporter has no approval number, so that
 * column is blank on its row rather than carrying a placeholder. */
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
