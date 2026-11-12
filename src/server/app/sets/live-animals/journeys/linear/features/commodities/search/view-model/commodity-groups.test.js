import { describe, expect, it } from 'vitest'

import { commodityGroups } from './commodity-groups.js'

describe('#commodityGroups', () => {
  it('Should offer a species the search response gives a null common name as its Latin name alone', () => {
    const results = {
      groups: [
        {
          code: '01062000',
          species: [{ latinName: 'Otra Testudinata', commonName: null }]
        }
      ]
    }

    expect(commodityGroups(results, [])).toEqual([
      {
        legendHtml: '01062000',
        items: [
          {
            value: '01062000|Otra Testudinata',
            html: 'Otra Testudinata',
            checked: false
          }
        ]
      }
    ])
  })
})
