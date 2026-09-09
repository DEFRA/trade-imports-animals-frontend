import { isBlank } from '../../../../../../../../lib/answered.js'
import { copyFor } from '../../../../../../../../shared/copy.js'
import { copy as en } from '../../copy/copy.en.js'
import { copy as cy } from '../../copy/copy.cy.js'

const copy = copyFor({ en, cy })

const NOT_PROVIDED = copy.notProvided

export const cellText = (value) => (value ?? '').trim() || NOT_PROVIDED

export const dateText = (value) =>
  isBlank(value) ? NOT_PROVIDED : `${value.day}/${value.month}/${value.year}`

// Table cells built as HTML lose Nunjucks' auto-escaping, so anything the
// trader typed — a document reference, say — is escaped here before it is
// interpolated into a cell's markup.
export const escapeHtml = (value) =>
  value
    .toString()
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
