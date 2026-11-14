import * as state from '../../../../../../engine/index.js'
import { copyFor } from '../../../../../../shared/copy.js'
import { copy as en } from './copy/copy.en.js'
import { copy as cy } from './copy/copy.cy.js'

const copy = copyFor({ en, cy })

export const outstandingItems = (status) =>
  status === state.SUBMITTED_ACTION_REQUIRED ? [copy.outstanding.documents] : []
