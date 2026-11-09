import { JSDOM } from 'jsdom'
import { describe, expect, it } from 'vitest'

import { copy as addressesCopy } from '../../copy/copy.en.js'
import {
  PICKER_ROW_LOCALITY_LINE,
  PICKER_ROW_NAME,
  PICKER_ROW_STREET_LINE,
  PICKER_ROW_VIEW_HREF,
  pickerRow
} from '../test-support.js'
import { pickerTableRows } from './table-rows.js'

const copy = addressesCopy.picker

const fragmentOf = (html) => JSDOM.fragment(html)

const textLinesOf = (html) => {
  const cell = JSDOM.fragment(`<div>${html}</div>`).firstChild
  return [...cell.childNodes]
    .filter((node) => node.nodeName !== 'BR')
    .map((node) => node.textContent.trim())
}

describe('#pickerTableRows', () => {
  it('Should give each address a checked radio, its name, its address lines with a break between each, and its country', () => {
    const [[selectCell, name, addressCell, country]] = pickerTableRows(
      [pickerRow({ checked: true })],
      copy
    )

    const radio = fragmentOf(selectCell.html).querySelector('input')

    expect(radio.getAttribute('type')).toBe('radio')
    expect(radio.getAttribute('name')).toBe('party')
    expect(radio.getAttribute('value')).toBe('astra-rosales')
    expect(radio.checked).toBe(true)
    expect(fragmentOf(selectCell.html).textContent.trim()).toBe(
      `${copy.selectRowPrefix} ${PICKER_ROW_NAME}`
    )
    expect(name).toEqual({ text: PICKER_ROW_NAME })
    expect(textLinesOf(addressCell.html)).toEqual([
      PICKER_ROW_STREET_LINE,
      PICKER_ROW_LOCALITY_LINE
    ])
    expect(fragmentOf(addressCell.html).querySelectorAll('br')).toHaveLength(1)
    expect(country).toEqual({ text: 'Portugal' })
  })

  it('Should escape markup in a stored address line', () => {
    const [[, , addressCell]] = pickerTableRows(
      [
        pickerRow({ addressLines: ['<b>Unit 1</b>', PICKER_ROW_LOCALITY_LINE] })
      ],
      copy
    )

    expect(textLinesOf(addressCell.html)).toEqual([
      '<b>Unit 1</b>',
      PICKER_ROW_LOCALITY_LINE
    ])
    expect(fragmentOf(addressCell.html).querySelector('b')).toBeNull()
  })

  it("Should end each row with a 'View' link to the address, named for screen readers by the address's name", () => {
    const [row] = pickerTableRows([pickerRow()], copy)

    const cell = fragmentOf(row.at(-1).html)
    const [link] = cell.children

    expect([...cell.children].map((element) => element.tagName)).toEqual(['A'])
    expect(link.getAttribute('href')).toBe(PICKER_ROW_VIEW_HREF)
    expect(link.textContent).toBe(`${copy.view} ${PICKER_ROW_NAME}`)
    expect(link.querySelector('.govuk-visually-hidden').textContent).toBe(
      ` ${PICKER_ROW_NAME}`
    )
  })

  it('Should leave the radio unchecked for an address that is not the selected one', () => {
    const [[selectCell]] = pickerTableRows([pickerRow()], copy)

    expect(fragmentOf(selectCell.html).querySelector('input').checked).toBe(
      false
    )
  })
})
