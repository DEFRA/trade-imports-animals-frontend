import { describe, expect, it } from 'vitest'

import { escapeHtml } from './escape-html.js'

describe('#escapeHtml', () => {
  it.each([
    ['&', '&amp;'],
    ['<', '&lt;'],
    ['>', '&gt;'],
    ['"', '&quot;'],
    ["'", '&#39;']
  ])('Should escape %s as %s', (character, escaped) => {
    expect(escapeHtml(`a${character}b`)).toBe(`a${escaped}b`)
  })

  it('Should escape every character in a script tag', () => {
    expect(escapeHtml(`<script>alert("x & 'y'")</script>`)).toBe(
      '&lt;script&gt;alert(&quot;x &amp; &#39;y&#39;&quot;)&lt;/script&gt;'
    )
  })

  it('Should turn a number into its text', () => {
    expect(escapeHtml(42)).toBe('42')
  })
})
