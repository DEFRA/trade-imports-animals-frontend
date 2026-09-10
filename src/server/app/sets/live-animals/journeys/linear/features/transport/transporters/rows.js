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

/** The fold both sides of a search go through.
 *
 * Lower case and stripped of accents, so a trader types "Garcia" for "García"
 * and an approval number in whichever case they happen to have it. The
 * haystack and the term must fold identically or nothing matches, which is why
 * it is one function rather than two copies. */
const foldForSearch = (text) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()

/** The one string a search term is matched against.
 *
 * Design release 1 searches over the three facts its list shows — the name,
 * the address and the approval number — joined so a term spanning two of them
 * still finds its row. A private transporter has no approval number, so that
 * part of its haystack is empty. */
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
 * An empty term is not a search: the whole list stands, which is what a trader
 * arriving at the page sees. */
export const matchingTransporters = (records, query = '') => {
  const term = foldForSearch(query.trim())
  return term
    ? records.filter((record) => searchableText(record).includes(term))
    : records
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
