import { describe, test, expect, beforeEach } from 'vitest'
import { renderComponent } from '../../test-helpers/component-helpers.js'

const REFERENCE_NUMBER = 'GBCHD2024.1234567'

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
  })
})
