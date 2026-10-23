import { describe, expect, it } from 'vitest'

import { withReveals } from './globals.js'

describe('#withReveals', () => {
  it('Should attach to each option the reveal held under its value and leave the others without one', () => {
    const options = [
      { value: 'a', text: 'A', hint: { text: 'Hint A' }, checked: true },
      { value: 'b', text: 'B', hint: { text: 'Hint B' }, checked: false }
    ]

    expect(withReveals(options, { a: '<p>Reveal A</p>' })).toEqual([
      {
        value: 'a',
        text: 'A',
        hint: { text: 'Hint A' },
        checked: true,
        conditional: { html: '<p>Reveal A</p>' }
      },
      {
        value: 'b',
        text: 'B',
        hint: { text: 'Hint B' },
        checked: false,
        conditional: { html: undefined }
      }
    ])
  })
})
