import { describe, expect, it } from 'vitest'

import { withAttributes, withReveals } from './globals.js'

describe('#withAttributes', () => {
  it('Should add the attributes beside the button own and keep every other param', () => {
    expect(
      withAttributes(
        {
          text: 'Save',
          classes: 'govuk-button--warning',
          attributes: { 'data-a': 'b' }
        },
        { formaction: '/upload' }
      )
    ).toEqual({
      text: 'Save',
      classes: 'govuk-button--warning',
      attributes: { 'data-a': 'b', formaction: '/upload' }
    })
  })

  it('Should give a button with no attributes the ones passed', () => {
    expect(withAttributes({ text: 'Save' }, { formaction: '/upload' })).toEqual(
      { text: 'Save', attributes: { formaction: '/upload' } }
    )
  })
})

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
