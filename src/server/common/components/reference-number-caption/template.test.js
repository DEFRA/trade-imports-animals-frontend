import { describe, test, expect, beforeEach } from 'vitest'
import { renderComponent } from '../../test-helpers/component-helpers.js'

const REFERENCE_NUMBER = 'GBN-AG-26-ABC123'

describe('Reference Number Caption Component', () => {
  describe('With a reference number', () => {
    let $component

    beforeEach(() => {
      $component = renderComponent('reference-number-caption', {
        referenceNumber: REFERENCE_NUMBER
      })
    })

    test('Should render the caption element', () => {
      expect(
        $component('[data-testid="app-reference-number-caption"]')
      ).toHaveLength(1)
    })

    test('Should contain the reference number value', () => {
      expect(
        $component('[data-testid="app-reference-number-caption"]').text().trim()
      ).toBe(REFERENCE_NUMBER)
    })

    test('Should wrap the caption in a styled paragraph', () => {
      const $wrapper = $component('p.govuk-body')
      expect($wrapper).toHaveLength(1)
      expect($wrapper.attr('class')).toContain('govuk-!-margin-bottom-6')
      expect(
        $wrapper.find('[data-testid="app-reference-number-caption"]')
      ).toHaveLength(1)
    })
  })

  describe('Without a reference number', () => {
    let $component

    beforeEach(() => {
      $component = renderComponent('reference-number-caption', {})
    })

    test('Should not render the caption element', () => {
      expect(
        $component('[data-testid="app-reference-number-caption"]')
      ).toHaveLength(0)
    })

    test('Should not render a paragraph wrapper', () => {
      expect($component('p')).toHaveLength(0)
    })
  })
})
