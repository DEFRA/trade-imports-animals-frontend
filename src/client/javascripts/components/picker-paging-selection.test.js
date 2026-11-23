// @vitest-environment jsdom

import { createAll } from 'govuk-frontend'
import { beforeEach, describe, expect, it } from 'vitest'
import PickerPagingSelection from './picker-paging-selection.js'

const PICKER_PATH =
  '/live-animals/notifications/GBN-AG-26-ABC123/consignors/select'

const render = () => {
  document.body.innerHTML = `
    <form method="post" novalidate data-module="app-picker-paging-selection">
      <input type="radio" name="party" value="astra-rosales" />
      <input type="radio" name="party" value="danish-meat-export-aps" />
      <nav class="govuk-pagination">
        <a class="govuk-pagination__link" href="${PICKER_PATH}?q=den&amp;selected=alpine-dairy">1</a>
        <a class="govuk-pagination__link" href="${PICKER_PATH}?q=den&amp;page=2&amp;selected=alpine-dairy">2</a>
      </nav>
    </form>`
  document.body.classList.add('govuk-frontend-supported')
  createAll(PickerPagingSelection, undefined, { scope: document.body })
}

const pagingHrefs = () =>
  [...document.querySelectorAll('.govuk-pagination a')].map((link) =>
    link.getAttribute('href')
  )

const tick = (value) => {
  const radio = document.querySelector(`input[value="${value}"]`)
  radio.checked = true
  radio.dispatchEvent(new Event('change', { bubbles: true }))
}

describe('PickerPagingSelection', () => {
  beforeEach(render)

  it('Should carry a ticked address through every paging link, keeping the search term and the page', () => {
    tick('danish-meat-export-aps')

    expect(pagingHrefs()).toEqual([
      `${PICKER_PATH}?q=den&selected=danish-meat-export-aps`,
      `${PICKER_PATH}?q=den&page=2&selected=danish-meat-export-aps`
    ])
  })

  it('Should replace the address the server rendered each time another is ticked', () => {
    tick('danish-meat-export-aps')
    tick('astra-rosales')

    expect(pagingHrefs()).toEqual([
      `${PICKER_PATH}?q=den&selected=astra-rosales`,
      `${PICKER_PATH}?q=den&page=2&selected=astra-rosales`
    ])
  })

  it('Should leave the paging links alone until an address is ticked', () => {
    expect(pagingHrefs()).toEqual([
      `${PICKER_PATH}?q=den&selected=alpine-dairy`,
      `${PICKER_PATH}?q=den&page=2&selected=alpine-dairy`
    ])
  })
})
