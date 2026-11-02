import { JSDOM } from 'jsdom'
import { describe, expect, it } from 'vitest'

import { copy as addressesCopy } from '../../copy/copy.en.js'
import { pickerTableRows } from './table-rows.js'

const copy = addressesCopy.picker
const NAME = 'Astra Rosales'

const row = {
  id: 'astra-rosales',
  idPrefix: 'party',
  name: NAME,
  addressText: 'Rua da Boavista 100, Porto, 4050-113',
  country: 'Portugal',
  detailLines: [NAME, 'Rua da Boavista 100'],
  checked: true
}

const fragmentOf = (html) => JSDOM.fragment(html)

describe('#pickerTableRows', () => {
  it('Should give each address a checked radio, its plain facts and a details cell listing its lines', () => {
    const [[selectCell, name, address, country, detailsCell]] = pickerTableRows(
      [row],
      copy
    )

    const radio = fragmentOf(selectCell.html).querySelector('input')
    const details = fragmentOf(detailsCell.html)

    expect(radio.getAttribute('type')).toBe('radio')
    expect(radio.getAttribute('name')).toBe('party')
    expect(radio.getAttribute('value')).toBe('astra-rosales')
    expect(radio.checked).toBe(true)
    expect(fragmentOf(selectCell.html).textContent.trim()).toBe(
      `${copy.selectRowPrefix} Astra Rosales`
    )
    expect([name, address, country]).toEqual([
      { text: NAME },
      { text: 'Rua da Boavista 100, Porto, 4050-113' },
      { text: 'Portugal' }
    ])
    expect(
      [...details.querySelectorAll('li')].map((item) => item.textContent)
    ).toEqual([NAME, 'Rua da Boavista 100'])
  })

  it('Should leave the radio unchecked for an address that is not the selected one', () => {
    const [[selectCell]] = pickerTableRows([{ ...row, checked: false }], copy)

    expect(fragmentOf(selectCell.html).querySelector('input').checked).toBe(
      false
    )
  })
})
