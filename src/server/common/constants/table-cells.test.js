import { describe, expect, it } from 'vitest'

import {
  hiddenActionsHeading,
  removeActionCell,
  wrappingCell
} from './table-cells.js'

describe('#wrappingCell', () => {
  it('Should keep the content and add the break-anywhere class', () => {
    expect(wrappingCell({ text: 'ABC' })).toEqual({
      text: 'ABC',
      classes: 'app-table__cell--break-anywhere'
    })
  })
})

describe('#removeActionCell', () => {
  it('Should return a right-aligned link button naming the action, with the hidden name after the text', () => {
    expect(
      removeActionCell({
        action: 'remove:0',
        text: 'Remove',
        hiddenText: 'Cattle'
      })
    ).toEqual({
      html: '<button type="submit" class="govuk-link app-link-button" name="action" value="remove:0">Remove<span class="govuk-visually-hidden"> Cattle</span></button>',
      classes: 'govuk-!-text-align-right'
    })
  })

  it('Should escape the action, the text and the hidden name', () => {
    const { html } = removeActionCell({
      action: 'a"b',
      text: '<Remove>',
      hiddenText: 'Tom & Jerry'
    })

    expect(html).toBe(
      '<button type="submit" class="govuk-link app-link-button" name="action" value="a&quot;b">&lt;Remove&gt;<span class="govuk-visually-hidden"> Tom &amp; Jerry</span></button>'
    )
  })
})

describe('#hiddenActionsHeading', () => {
  it('Should return a header cell holding only visually hidden text', () => {
    expect(hiddenActionsHeading('Actions')).toEqual({
      html: '<span class="govuk-visually-hidden">Actions</span>'
    })
  })
})
