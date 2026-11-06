import { JSDOM } from 'jsdom'
import { describe, expect, it } from 'vitest'

import { copy as addressesCopy } from '../../copy/copy.en.js'
import { pickerTableRows } from './table-rows.js'

const copy = addressesCopy.picker
const NAME = 'Astra Rosales'
const STREET_LINE = 'Rua da Boavista 100'
const LOCALITY_LINE = 'Porto, 4050-113'
const VIEW_HREF =
  'http://localhost:3002/address-book/astra-rosales?return=http%3A%2F%2Flocalhost%3A3000%2Fpicker'

const row = {
  id: 'astra-rosales',
  idPrefix: 'party',
  name: NAME,
  addressLines: [STREET_LINE, LOCALITY_LINE],
  country: 'Portugal',
  viewHref: VIEW_HREF,
  checked: true
}

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
      [row],
      copy
    )

    const radio = fragmentOf(selectCell.html).querySelector('input')

    expect(radio.getAttribute('type')).toBe('radio')
    expect(radio.getAttribute('name')).toBe('party')
    expect(radio.getAttribute('value')).toBe('astra-rosales')
    expect(radio.checked).toBe(true)
    expect(fragmentOf(selectCell.html).textContent.trim()).toBe(
      `${copy.selectRowPrefix} Astra Rosales`
    )
    expect(name).toEqual({ text: NAME })
    expect(textLinesOf(addressCell.html)).toEqual([STREET_LINE, LOCALITY_LINE])
    expect(fragmentOf(addressCell.html).querySelectorAll('br')).toHaveLength(1)
    expect(country).toEqual({ text: 'Portugal' })
  })

  it('Should escape markup in a stored address line', () => {
    const [[, , addressCell]] = pickerTableRows(
      [{ ...row, addressLines: ['<b>Unit 1</b>', LOCALITY_LINE] }],
      copy
    )

    expect(textLinesOf(addressCell.html)).toEqual([
      '<b>Unit 1</b>',
      LOCALITY_LINE
    ])
    expect(fragmentOf(addressCell.html).querySelector('b')).toBeNull()
  })

  it("Should end each row with a 'View' link to the address, named for screen readers by the address's name", () => {
    const [[, , , , viewCell]] = pickerTableRows([row], copy)

    const cell = fragmentOf(viewCell.html)
    const [link] = cell.children

    expect([...cell.children].map((element) => element.tagName)).toEqual(['A'])
    expect(link.getAttribute('href')).toBe(VIEW_HREF)
    expect(link.textContent).toBe(`${copy.view} ${NAME}`)
    expect(link.querySelector('.govuk-visually-hidden').textContent).toBe(
      ` ${NAME}`
    )
  })

  it('Should leave the radio unchecked for an address that is not the selected one', () => {
    const [[selectCell]] = pickerTableRows([{ ...row, checked: false }], copy)

    expect(fragmentOf(selectCell.html).querySelector('input').checked).toBe(
      false
    )
  })
})
