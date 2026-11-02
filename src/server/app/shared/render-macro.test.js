import { describe, expect, it } from 'vitest'

import { renderMacro } from './render-macro.js'

describe('#renderMacro', () => {
  it('Should render a macro of a template with the arguments it is given, escaping their text', () => {
    expect(
      renderMacro(
        'shared/section-caption.njk',
        'sectionCaption',
        'Origin & route'
      )
    ).toContain('Origin &amp; route')
  })
})
