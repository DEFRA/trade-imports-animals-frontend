import { describe, expect, it } from 'vitest'

import { copyFor } from '../../../../../../../shared/copy.js'
import { copy as en } from '../copy/copy.en.js'
import { copy as cy } from '../copy/copy.cy.js'
import { SCAN_STATUS } from '../scan-poll.js'
import { actionsCell, filePath } from './rows.js'

const copy = copyFor({ en, cy })

const JOURNEY_ID = '7f3c1f4e-9a2b-4d61-8c55-0b1d2e3f4a5b'
const UPLOAD_ID = 'c4d9e8f1-2a3b-4c5d-9e8f-1a2b3c4d5e6f'

describe('#actionsCell', () => {
  it('Should separate the two actions with a gap before Remove and none after View file, so both end on the cell edge they are aligned to', () => {
    const cell = actionsCell({
      entry: { uploadId: UPLOAD_ID },
      index: 0,
      scanStatus: SCAN_STATUS.COMPLETE,
      journeyId: JOURNEY_ID
    })

    expect(cell.classes).toBe('govuk-!-text-align-right')
    expect(cell.html).toBe(
      `<a class="govuk-link" href="${filePath(JOURNEY_ID, UPLOAD_ID)}">` +
        `${copy.viewFile}<span class="govuk-visually-hidden"> ${copy.viewFileHidden(1)}</span></a>` +
        '<button type="submit" class="govuk-link app-link-button govuk-!-margin-left-3" name="action" value="remove:0">' +
        `${copy.remove}<span class="govuk-visually-hidden"> ${copy.removeHidden(1)}</span></button>`
    )
  })
})
