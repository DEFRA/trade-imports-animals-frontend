import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { TAG_CLASSES } from './levels.js'

const govukFrontendCss = readFileSync(
  new URL(
    '../../../../node_modules/govuk-frontend/dist/govuk/govuk-frontend.min.css',
    import.meta.url
  ),
  'utf-8'
)

describe('page maturity levels', () => {
  it.each(Object.entries(TAG_CLASSES))(
    'Should give %s a tag colour that GOV.UK Frontend styles',
    (_, tagClass) => {
      expect(govukFrontendCss.includes(`.${tagClass}{`), tagClass).toBe(true)
    }
  )
})
