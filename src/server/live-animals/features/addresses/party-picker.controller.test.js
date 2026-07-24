import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { buildDispatch } from '../../flow/dispatch.js'
import { store } from '../../engine/store.js'
import { configureRecords } from '../../engine/persistence/records.js'
import { configureSession } from '../../engine/persistence/session.js'
import { records as recordsStub } from '../../services/persistence/records/stub.js'
import { session as sessionStub } from '../../services/persistence/session/stub.js'
import { driveHandler } from '../../engine/test-support.js'
import { dispatchPages } from '../index.js'
import * as addressBook from '../../services/address-book/index.js'

import * as partyPicker from './party-picker.controller.js'
import { PARTIES } from './parties.js'

const handlerFor = (method, slug) =>
  partyPicker.routes.find(
    (route) => route.method === method && route.path.endsWith(slug)
  ).handler

const getConsignor = handlerFor('GET', 'consignors/select')
const postConsignor = handlerFor('POST', 'consignors/select')

const pickerFrom = (result) => result.view.context.picker
const idsOf = (picker) => picker.rows.map((row) => row.id)

const configure = () => {
  configureRecords(recordsStub)
  configureSession(sessionStub)
  buildDispatch(dispatchPages)
}

describe('GET /consignors/select', () => {
  beforeAll(configure)
  beforeEach(() => store.clear())

  it('Should render the first page of the book with a radio per row and pagination over the rest', async () => {
    const picker = pickerFrom(await driveHandler(getConsignor))

    expect(picker.page).toBe(1)
    expect(picker.resultsCaption).toBe('Showing 5 of 40 addresses')
    expect(idsOf(picker)).toEqual([
      'astra-rosales',
      'eurostore-services',
      'laiterie-du-nord',
      'danish-meat-export',
      'portuguese-livestock'
    ])
    expect(picker.rows[0]).toMatchObject({
      name: 'Astra Rosales',
      country: 'Switzerland',
      checked: false
    })
    expect(picker.pagination.items.at(-1).number).toBe(8)
    expect(picker.pagination.previous).toBeUndefined()
    expect(picker.selected).toBeUndefined()
  })

  it('Should expand each row into the whole record for the View details disclosure', async () => {
    const picker = pickerFrom(await driveHandler(getConsignor))
    const row = picker.rows[3]

    expect(row.addressText).toBe('Vesterbrogade 12, Copenhagen, 1620')
    expect(row.detailLines).toEqual([
      'Danish Meat Export ApS',
      'Vesterbrogade 12',
      'Copenhagen',
      '1620',
      'Denmark'
    ])
  })

  it('Should render a later page, carrying the search and the selection into every pagination link', async () => {
    const picker = pickerFrom(
      await driveHandler(getConsignor, {
        query: { page: '3', selected: 'iberian-swine' }
      })
    )

    expect(picker.page).toBe(3)
    expect(idsOf(picker)).toContain('irish-beef-traders')
    expect(picker.selected.name).toBe('Iberian Swine SA')
    expect(picker.pagination.next.href).toBe(
      '/prototype-standalone/live-animals/consignors/select?page=4&selected=iberian-swine'
    )
    expect(picker.pagination.items[0].href).toBe(
      '/prototype-standalone/live-animals/consignors/select?page=1&selected=iberian-swine'
    )
  })

  it('Should filter the book down to the search matches and drop the pagination when one page holds them', async () => {
    const picker = pickerFrom(
      await driveHandler(getConsignor, { query: { q: 'denmark' } })
    )

    expect(picker.resultsCaption).toBe('Showing 2 of 2 addresses')
    expect(idsOf(picker)).toEqual(['danish-meat-export', 'jutland-swine'])
    expect(picker.pagination).toBeNull()
  })

  it('Should pre-check the row the committed answer was copied from', async () => {
    const picker = pickerFrom(
      await driveHandler(getConsignor, {
        seed: {
          consignor: {
            name: 'Bavarian Cattle GmbH',
            address: { addressLine1: 'Maximilianstrasse 8' }
          }
        },
        query: { page: '2' }
      })
    )

    const row = picker.rows.find((each) => each.id === 'bavarian-cattle')
    expect(picker.selected.id).toBe('bavarian-cattle')
    expect(row.checked).toBe(true)
  })
})

describe('POST /consignors/select', () => {
  beforeAll(configure)
  beforeEach(() => store.clear())

  it('Should re-render the matches from page one on a search, saving nothing', async () => {
    const result = await driveHandler(postConsignor, {
      payload: { action: 'search', q: 'Copenhagen', page: '3' }
    })
    const picker = pickerFrom(result)

    expect(result.response.statusCode).toBe(200)
    expect(picker.page).toBe(1)
    expect(idsOf(picker)).toEqual(['danish-meat-export'])
    expect(result.after.consignor).toBeUndefined()
  })

  it('Should carry a row ticked before the search across the round trip, still selected but off the results', async () => {
    const picker = pickerFrom(
      await driveHandler(postConsignor, {
        payload: { action: 'search', q: 'denmark', party: 'iberian-swine' }
      })
    )

    expect(picker.selected.id).toBe('iberian-swine')
    expect(idsOf(picker)).not.toContain('iberian-swine')
    expect(picker.rows.every((row) => row.checked === false)).toBe(true)
  })

  it('Should copy the row ticked on a later page onto the party and return to the addresses hub', async () => {
    const result = await driveHandler(postConsignor, {
      payload: { action: 'save', page: '3', party: 'iberian-swine' }
    })

    expect(result.response).toEqual({
      redirect: '/prototype-standalone/live-animals/addresses'
    })
    expect(result.after.consignor).toEqual({
      name: 'Iberian Swine SA',
      address: {
        addressLine1: 'Calle Gran Via 31',
        townOrCity: 'Madrid',
        postalOrZipCode: '28013',
        country: 'Spain'
      }
    })
  })

  it('Should save the selection made on an earlier page when the page on screen has no row ticked', async () => {
    const result = await driveHandler(postConsignor, {
      payload: { action: 'save', page: '6', selected: 'iberian-swine' }
    })

    expect(result.view).toBeUndefined()
    expect(result.after.consignor.name).toBe('Iberian Swine SA')
  })

  it('Should let a row ticked on the page on screen beat the selection carried from an earlier one', async () => {
    const result = await driveHandler(postConsignor, {
      payload: {
        action: 'save',
        page: '3',
        selected: 'iberian-swine',
        party: 'irish-beef-traders'
      }
    })

    expect(result.after.consignor.name).toBe('Irish Beef Traders Ltd')
  })

  it('Should reject a save with nothing selected, anchoring the error on the first row', async () => {
    const result = await driveHandler(postConsignor, {
      payload: { action: 'save', page: '2' }
    })

    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.picker.error).toBe(
      'Select a consignor from the list'
    )
    expect(result.view.context.errorSummary.errorList).toEqual([
      { text: 'Select a consignor from the list', href: '#party' }
    ])
    expect(result.view.context.picker.page).toBe(2)
    expect(result.after.consignor).toBeUndefined()
  })

  it('Should anchor the error on the search box when the search matched nothing to select', async () => {
    const result = await driveHandler(postConsignor, {
      payload: { action: 'save', q: 'no such trader' }
    })

    expect(result.view.context.errorSummary.errorList[0].href).toBe('#q')
    expect(result.view.context.picker.rows).toEqual([])
  })

  it('Should refuse an id that belongs to another role of the book', async () => {
    const result = await driveHandler(postConsignor, {
      payload: { action: 'save', party: 'tech-imports' }
    })

    expect(result.view.context.picker.error).toBe(
      'Select a consignor from the list'
    )
    expect(result.after.consignor).toBeUndefined()
  })
})

describe('The five spokes share the one picker', () => {
  beforeAll(configure)
  beforeEach(() => store.clear())

  it('Should serve every party from its own role of the book, committing to its own obligation', async () => {
    for (const party of PARTIES) {
      store.clear()
      const record = addressBook.parties(party.role).at(-1)
      const result = await driveHandler(handlerFor('POST', party.slug), {
        payload: { action: 'save', party: record.id }
      })

      expect(result.after[party.id]).toEqual({
        name: record.name,
        address: record.address
      })
      expect(result.response).toEqual({
        redirect: '/prototype-standalone/live-animals/addresses'
      })
    }
  })

  it('Should title each spoke and link its Add a new address button back to itself', async () => {
    for (const party of PARTIES) {
      const result = await driveHandler(handlerFor('GET', party.slug))

      expect(result.view.context.heading).toBe(party.title)
      expect(result.view.context.picker.createAddressHref).toBe(
        `/prototype-standalone/live-animals/addresses/create?for=${party.id}`
      )
    }
  })
})
