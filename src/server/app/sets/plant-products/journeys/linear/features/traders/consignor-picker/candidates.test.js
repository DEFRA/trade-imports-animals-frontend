import { afterEach, describe, expect, it, vi } from 'vitest'

import { CANNED_CONSIGNORS } from '../../../../../services/address-book/canned-consignors.js'
import {
  candidates,
  searchCandidates,
  NOTIFICATION_CONSIGNOR_ID
} from './candidates.js'

const sessionRequest = () => {
  const values = new Map()
  return {
    yar: {
      get: (key) => values.get(key),
      set: (key, value) => values.set(key, value)
    }
  }
}

const consignorAnswers = {
  consignorName: 'Orchard Export SAS',
  consignorAddressLine1: '12 Rue des Vergers',
  consignorAddressLine2: 'Building B',
  consignorAddressLine3: 'Export Quarter',
  consignorCity: 'Lyon',
  consignorPostcode: '69001',
  consignorTelephone: '+33 4 72 00 00 00',
  consignorCountry: 'FR',
  consignorEmail: 'exports@example.com'
}

const [firstCanned] = CANNED_CONSIGNORS

const answersMatching = (record) => ({
  consignorName: record.name,
  consignorAddressLine1: record.address.addressLine1,
  consignorAddressLine2: record.address.addressLine2,
  consignorAddressLine3: record.address.addressLine3,
  consignorCity: record.address.city,
  consignorPostcode: record.address.postcode,
  consignorTelephone: record.telephone,
  consignorCountry: record.address.country,
  consignorEmail: record.email
})

describe('consignor picker candidates', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it.each([
    { name: 'PLANT_PRODUCTS_MODE unset', mode: undefined },
    { name: 'PLANT_PRODUCTS_MODE=real', mode: 'real' },
    { name: 'PLANT_PRODUCTS_MODE=stub', mode: 'stub' }
  ])(
    'offers the twelve canned records and nothing else on a new notification with $name',
    async ({ mode }) => {
      vi.stubEnv('PLANT_PRODUCTS_MODE', mode)

      const pickable = await candidates(sessionRequest(), {})

      expect(pickable.map(({ id }) => id)).toEqual(
        CANNED_CONSIGNORS.map(({ id }) => id)
      )
    }
  )

  it('puts the consignor already on the notification first, carrying all nine answers', async () => {
    const pickable = await candidates(sessionRequest(), consignorAnswers)

    expect(pickable).toHaveLength(13)
    expect(pickable[0]).toEqual({
      id: NOTIFICATION_CONSIGNOR_ID,
      name: 'Orchard Export SAS',
      telephone: '+33 4 72 00 00 00',
      email: 'exports@example.com',
      address: {
        addressLine1: '12 Rue des Vergers',
        addressLine2: 'Building B',
        addressLine3: 'Export Quarter',
        city: 'Lyon',
        postcode: '69001',
        country: 'FR'
      }
    })
  })

  it('lists a canned record that duplicates the notification consignor once, not twice', async () => {
    const pickable = await candidates(
      sessionRequest(),
      answersMatching(firstCanned)
    )

    expect(pickable).toHaveLength(12)
    expect(pickable[0].id).toBe(NOTIFICATION_CONSIGNOR_ID)
    expect(pickable.map(({ id }) => id)).not.toContain(firstCanned.id)
  })

  it('keeps a same-named canned record when its address differs', async () => {
    const pickable = await candidates(sessionRequest(), {
      ...answersMatching(firstCanned),
      consignorCity: 'Somewhere Else'
    })

    expect(pickable).toHaveLength(13)
    expect(pickable.map(({ id }) => id)).toContain(firstCanned.id)
  })

  it('builds a record from a name-only notification rather than throwing', async () => {
    const pickable = await candidates(sessionRequest(), {
      consignorName: '  Half Entered Ltd  '
    })

    expect(pickable[0]).toEqual({
      id: NOTIFICATION_CONSIGNOR_ID,
      name: 'Half Entered Ltd',
      telephone: '',
      email: '',
      address: {
        addressLine1: '',
        addressLine2: '',
        addressLine3: '',
        city: '',
        postcode: '',
        country: ''
      }
    })
  })

  it('offers nothing extra when the notification has no consignor name', async () => {
    const pickable = await candidates(sessionRequest(), {
      consignorName: '   ',
      consignorCity: 'Lyon'
    })

    expect(pickable.map(({ id }) => id)).not.toContain(
      NOTIFICATION_CONSIGNOR_ID
    )
  })
})

describe('consignor picker paged candidates', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it.each([
    { name: 'PLANT_PRODUCTS_MODE unset', mode: undefined },
    { name: 'PLANT_PRODUCTS_MODE=real', mode: 'real' },
    { name: 'PLANT_PRODUCTS_MODE=stub', mode: 'stub' }
  ])(
    'opens page one with the notification consignor then four canned records with $name',
    async ({ mode }) => {
      vi.stubEnv('PLANT_PRODUCTS_MODE', mode)

      const found = await searchCandidates(
        sessionRequest(),
        consignorAnswers,
        {}
      )

      expect(found).toMatchObject({ total: 13, page: 1, totalPages: 3 })
      expect(found.results.map(({ id }) => id)).toEqual([
        NOTIFICATION_CONSIGNOR_ID,
        'example-consignor-01',
        'example-consignor-02',
        'example-consignor-03',
        'example-consignor-04'
      ])
    }
  )

  it('holds the tail of the list on the last page', async () => {
    const found = await searchCandidates(sessionRequest(), consignorAnswers, {
      page: 3
    })

    expect(found.results.map(({ id }) => id)).toEqual([
      'example-consignor-10',
      'example-consignor-11',
      'example-consignor-12'
    ])
  })

  it('omits the notification consignor from a query it does not match', async () => {
    const found = await searchCandidates(sessionRequest(), consignorAnswers, {
      query: 'Example Business Park'
    })

    expect(found.total).toBe(12)
    expect(found.results.map(({ id }) => id)).not.toContain(
      NOTIFICATION_CONSIGNOR_ID
    )
  })

  it('finds the notification consignor by a value only it carries', async () => {
    const found = await searchCandidates(sessionRequest(), consignorAnswers, {
      query: 'Rue des Vergers'
    })

    expect(found.results.map(({ id }) => id)).toEqual([
      NOTIFICATION_CONSIGNOR_ID
    ])
  })

  // A record chosen on page 2 is posted back from page 1, so the unpaged list
  // has to stay complete or that choice could never be resolved.
  it('leaves the unpaged list whole so an off-page selection still resolves', async () => {
    const request = sessionRequest()
    const pickable = await candidates(request, consignorAnswers)
    const found = await searchCandidates(request, consignorAnswers, { page: 1 })
    const onPageOne = found.results.map(({ id }) => id)

    expect(pickable).toHaveLength(13)
    expect(onPageOne).not.toContain('example-consignor-12')
    expect(
      pickable.find(({ id }) => id === 'example-consignor-12')
    ).toMatchObject({ name: 'Example Consignor 12 (sample data)' })
  })
})
