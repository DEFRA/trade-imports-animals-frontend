import { describe, expect, it } from 'vitest'

import { SET_ID } from '../../../../set.js'
import {
  driveHandler,
  getHandlerOf,
  postHandlerOf,
  refusingSaves,
  unavailableBackendError,
  useStubbedJourney
} from '../../../../../../engine/test-support.js'
import { dispatchPages } from '../index.js'
import { pagePath } from '../../../../../../shared/paths.js'
import { withTrail } from '../../../../../../shared/kit.js'
import {
  itSendsBackToWhereTheTraderCameFrom,
  petConsignmentSeed
} from '../../test-support.js'
import {
  BOS_TAURUS_ROW,
  FELIS_CATUS_ROW,
  MUSTELA_PUTORIUS_FURO_ROW,
  lineOf
} from '../commodities/search/test-support.js'
import { addressesPage } from '../addresses/page.js'
import * as permanentAddress from './controller.js'
import { cardKeyFor, fieldNameFor } from './cards.js'

const get = getHandlerOf(permanentAddress)
const post = postHandlerOf(permanentAddress)

const PLACE_OF_DESTINATION_PARTY = {
  name: 'Riverside Holding Facility',
  phone: '01234 567890',
  email: 'destination@example.com',
  address: {
    addressLine1: 'East Farm Road',
    townOrCity: 'Leeds',
    postcode: 'LS25 3EB',
    countryCode: 'GB'
  }
}

const HAND_ENTERED_ADDRESS = {
  nameOrOrganisationName: 'Pet Owner',
  addressLine1: '1 Farm Lane',
  townOrCity: 'Skipton',
  county: 'North Yorkshire',
  postcode: 'BD23 1UD',
  email: 'owner@example.com',
  phone: '01756 555019'
}

const catLine = (units) => ({ row: FELIS_CATUS_ROW, units })
const ferretLine = (units) => ({ row: MUSTELA_PUTORIUS_FURO_ROW, units })

const cardsFrom = (result) => result.view.context.cards

const optionPayload = (key, value) => ({ [fieldNameFor('option', key)]: value })

const newAddressPayload = (key, values) =>
  Object.fromEntries(
    Object.entries(values).map(([field, value]) => [
      fieldNameFor(field, key),
      value
    ])
  )

describe('permanent-address — the guard', () => {
  useStubbedJourney(SET_ID, dispatchPages)

  it('Should send a consignment with no cat, dog or ferret line to the consignment addresses page, saving nothing, logging once', async () => {
    const result = await driveHandler(get, {
      seed: { countryOfOrigin: 'FR', commodityLines: [BOS_TAURUS_ROW] }
    })

    expect(result.response.redirect).toBe(
      pagePath(result.journeyId, addressesPage.slug)
    )
    expect(result.after.commodityLines).toEqual([BOS_TAURUS_ROW])
    expect(result.logger.entries).toEqual([
      {
        level: 'info',
        message:
          'Permanent address skipped: no animal on this consignment needs a permanent address',
        fields: expect.objectContaining({
          journeyId: result.journeyId,
          reason: 'no-animal-needs-permanent-address',
          commodityCodes: [BOS_TAURUS_ROW.commodityCode]
        })
      }
    ])
  })

  it('Should send a cat line with no animal record entered the same way', async () => {
    const result = await driveHandler(get, {
      seed: { countryOfOrigin: 'FR', commodityLines: [FELIS_CATUS_ROW] }
    })

    expect(result.response.redirect).toBe(
      pagePath(result.journeyId, addressesPage.slug)
    )
  })
})

describe('permanent-address — the card list', () => {
  useStubbedJourney(SET_ID, dispatchPages)

  it('Should give a cat line of two records and a ferret line of one three cards, in line and record order, titled by species and number, with a non-pet line on the same consignment carrying none', async () => {
    const seed = petConsignmentSeed(
      catLine([
        { animalIdentifierMicrochip: 'MC-1' },
        { animalIdentifierMicrochip: 'MC-2' }
      ]),
      ferretLine([{ animalIdentifierMicrochip: 'MC-3' }])
    )
    seed.commodityLines.push(
      lineOf(BOS_TAURUS_ROW, {
        animalIdentifiers: [{ animalIdentifierEarTag: 'UK1' }]
      })
    )

    const result = await driveHandler(get, { seed })

    expect(cardsFrom(result).map((card) => card.title)).toEqual([
      'Felis catus 1',
      'Felis catus 2',
      'Mustela putorius furo 1'
    ])
  })

  it('Should inset each identifier the animal has as label and value, leaving out the ones it does not carry', async () => {
    const seed = petConsignmentSeed(
      catLine([{ animalIdentifierMicrochip: 'MICROCHIP-1' }])
    )

    const result = await driveHandler(get, { seed })

    expect(cardsFrom(result)[0].identifierLines).toEqual([
      'Microchip: MICROCHIP-1'
    ])
  })

  it('Should hint the first option with the place of destination on one line, name first, ending with the country, once one is chosen, and carry no such hint when none is', async () => {
    const seed = petConsignmentSeed(
      catLine([{ animalIdentifierMicrochip: 'MC-1' }])
    )

    const withoutDestination = await driveHandler(get, { seed })
    expect(cardsFrom(withoutDestination)[0].options[0].hint).toBeUndefined()

    const withDestination = await driveHandler(get, {
      seed: { ...seed, placeOfDestination: PLACE_OF_DESTINATION_PARTY }
    })
    expect(cardsFrom(withDestination)[0].options[0].hint).toBe(
      'Riverside Holding Facility, East Farm Road, Leeds, LS25 3EB, United Kingdom'
    )
  })

  it('Should select neither option on first opening', async () => {
    const seed = petConsignmentSeed(
      catLine([{ animalIdentifierMicrochip: 'MC-1' }])
    )

    const result = await driveHandler(get, { seed })

    const [option1, option2] = cardsFrom(result)[0].options
    expect(option1.checked).toBe(false)
    expect(option2.checked).toBe(false)
  })
})

describe('permanent-address — saving', () => {
  useStubbedJourney(SET_ID, dispatchPages)

  it('Should store a copy of the place of destination, and the choice, when saved as living there', async () => {
    const seed = {
      ...petConsignmentSeed(catLine([{ animalIdentifierMicrochip: 'MC-1' }])),
      placeOfDestination: PLACE_OF_DESTINATION_PARTY
    }
    const key = cardKeyFor(0, 0)

    const result = await driveHandler(post, {
      seed,
      payload: optionPayload(key, 'placeOfDestination')
    })

    const unit = result.after.commodityLines[0].animalIdentifiers[0]
    expect(unit.permanentAddressOrigin).toBe('placeOfDestination')
    expect(unit.permanentAddress).toEqual(PLACE_OF_DESTINATION_PARTY)
  })

  it('Should record the place-of-destination choice with no address when the notification has none stored yet', async () => {
    const seed = petConsignmentSeed(
      catLine([{ animalIdentifierMicrochip: 'MC-1' }])
    )
    const key = cardKeyFor(0, 0)

    const result = await driveHandler(post, {
      seed,
      payload: optionPayload(key, 'placeOfDestination')
    })

    const unit = result.after.commodityLines[0].animalIdentifiers[0]
    expect(unit.permanentAddressOrigin).toBe('placeOfDestination')
    expect(unit.permanentAddress).toBeNull()
  })

  it('Should store a hand-entered address with a county and no second line in its own fields and the United Kingdom as the country, and the choice', async () => {
    const seed = petConsignmentSeed(
      catLine([{ animalIdentifierMicrochip: 'MC-1' }])
    )
    const key = cardKeyFor(0, 0)

    const result = await driveHandler(post, {
      seed,
      payload: {
        ...optionPayload(key, 'newAddress'),
        ...newAddressPayload(key, HAND_ENTERED_ADDRESS)
      }
    })

    const unit = result.after.commodityLines[0].animalIdentifiers[0]
    expect(unit.permanentAddressOrigin).toBe('newAddress')
    expect(unit.permanentAddress).toEqual({
      name: HAND_ENTERED_ADDRESS.nameOrOrganisationName,
      phone: HAND_ENTERED_ADDRESS.phone,
      email: HAND_ENTERED_ADDRESS.email,
      address: {
        addressLine1: HAND_ENTERED_ADDRESS.addressLine1,
        addressLine2: '',
        townOrCity: HAND_ENTERED_ADDRESS.townOrCity,
        county: HAND_ENTERED_ADDRESS.county,
        postcode: HAND_ENTERED_ADDRESS.postcode,
        countryCode: 'GB'
      }
    })
  })

  it('Should save the answered animal and leave the other with no permanent address or choice when neither option is chosen for it, going to the consignment addresses page', async () => {
    const seed = petConsignmentSeed(
      catLine([
        { animalIdentifierMicrochip: 'MC-1' },
        { animalIdentifierMicrochip: 'MC-2' }
      ])
    )
    const answeredKey = cardKeyFor(0, 0)

    const result = await driveHandler(post, {
      seed,
      payload: {
        ...optionPayload(answeredKey, 'newAddress'),
        ...newAddressPayload(answeredKey, {
          nameOrOrganisationName: 'Pet Owner'
        })
      }
    })

    const [answered, unanswered] =
      result.after.commodityLines[0].animalIdentifiers
    expect(answered.permanentAddressOrigin).toBe('newAddress')
    expect(unanswered.permanentAddressOrigin).toBeUndefined()
    expect(unanswered.permanentAddress).toBeUndefined()
    expect(result.response.redirect).toBe(
      withTrail(pagePath(result.journeyId, addressesPage.slug), [
        'permanent-address'
      ])
    )
  })

  it("Should write one commit per changed line and leave the lines' other answers, including identifiers, untouched", async () => {
    const seed = petConsignmentSeed(
      catLine([{ animalIdentifierMicrochip: 'MC-1' }]),
      ferretLine([{ animalIdentifierMicrochip: 'MC-2' }])
    )
    const catKey = cardKeyFor(0, 0)
    const ferretKey = cardKeyFor(1, 0)

    const result = await driveHandler(post, {
      seed,
      payload: {
        ...optionPayload(catKey, 'newAddress'),
        ...newAddressPayload(catKey, {
          nameOrOrganisationName: 'Cat Owner',
          addressLine1: '1 Cat Lane',
          townOrCity: 'Leeds',
          postcode: 'LS1 1AA',
          email: 'cat@example.com',
          phone: '0113 555019'
        }),
        ...optionPayload(ferretKey, 'newAddress'),
        ...newAddressPayload(ferretKey, {
          nameOrOrganisationName: 'Ferret Owner',
          addressLine1: '1 Ferret Lane',
          townOrCity: 'York',
          postcode: 'YO1 1AA',
          email: 'ferret@example.com',
          phone: '01904 555019'
        })
      }
    })

    expect(
      result.after.commodityLines[0].animalIdentifiers[0]
        .animalIdentifierMicrochip
    ).toBe('MC-1')
    expect(
      result.after.commodityLines[0].animalIdentifiers[0].permanentAddress.name
    ).toBe('Cat Owner')
    expect(
      result.after.commodityLines[1].animalIdentifiers[0]
        .animalIdentifierMicrochip
    ).toBe('MC-2')
    expect(
      result.after.commodityLines[1].animalIdentifiers[0].permanentAddress.name
    ).toBe('Ferret Owner')
  })
})

describe('permanent-address — reopening', () => {
  useStubbedJourney(SET_ID, dispatchPages)

  it('Should reopen with the place-of-destination option checked for an animal saved that way before a place of destination was known', async () => {
    const seed = petConsignmentSeed(
      catLine([
        {
          animalIdentifierMicrochip: 'MC-1',
          permanentAddressOrigin: 'placeOfDestination',
          permanentAddress: null
        }
      ])
    )

    const result = await driveHandler(get, { seed })

    const [pod] = cardsFrom(result)[0].options
    expect(pod.checked).toBe(true)
  })

  it('Should reopen with the place-of-destination option selected for an animal saved that way', async () => {
    const seed = petConsignmentSeed(
      catLine([
        {
          animalIdentifierMicrochip: 'MC-1',
          permanentAddressOrigin: 'placeOfDestination',
          permanentAddress: PLACE_OF_DESTINATION_PARTY
        }
      ])
    )

    const result = await driveHandler(get, { seed })

    const [pod, newAddr] = cardsFrom(result)[0].options
    expect(pod.checked).toBe(true)
    expect(newAddr.checked).toBe(false)
    expect(
      cardsFrom(result)[0].addressFields.every((field) => field.value === '')
    ).toBe(true)
  })

  it('Should reopen with the new-address option selected and each stored value back in its own field for an animal saved with a hand-entered address', async () => {
    const seed = petConsignmentSeed(
      catLine([
        {
          animalIdentifierMicrochip: 'MC-1',
          permanentAddressOrigin: 'newAddress',
          permanentAddress: {
            name: HAND_ENTERED_ADDRESS.nameOrOrganisationName,
            phone: HAND_ENTERED_ADDRESS.phone,
            email: HAND_ENTERED_ADDRESS.email,
            address: {
              addressLine1: HAND_ENTERED_ADDRESS.addressLine1,
              townOrCity: HAND_ENTERED_ADDRESS.townOrCity,
              county: HAND_ENTERED_ADDRESS.county,
              postcode: HAND_ENTERED_ADDRESS.postcode,
              countryCode: 'GB'
            }
          }
        }
      ])
    )

    const result = await driveHandler(get, { seed })

    const [pod, newAddr] = cardsFrom(result)[0].options
    expect(pod.checked).toBe(false)
    expect(newAddr.checked).toBe(true)
    const fields = cardsFrom(result)[0].addressFields
    expect(fields.map((field) => field.value)).toEqual([
      HAND_ENTERED_ADDRESS.nameOrOrganisationName,
      HAND_ENTERED_ADDRESS.addressLine1,
      '',
      HAND_ENTERED_ADDRESS.townOrCity,
      HAND_ENTERED_ADDRESS.county,
      HAND_ENTERED_ADDRESS.postcode,
      HAND_ENTERED_ADDRESS.email,
      HAND_ENTERED_ADDRESS.phone
    ])
  })

  it('Should carry a GOV.UK autocomplete token on the name, postcode, email and phone fields', async () => {
    const seed = petConsignmentSeed(
      catLine([{ animalIdentifierMicrochip: 'MC-1' }])
    )

    const result = await driveHandler(get, { seed })

    const fieldFor = (id) =>
      cardsFrom(result)[0].addressFields.find(
        (field) => field.id === fieldNameFor(id, cardKeyFor(0, 0))
      )
    expect(fieldFor('nameOrOrganisationName').autocomplete).toBe('organization')
    expect(fieldFor('postcode').autocomplete).toBe('postal-code')
    expect(fieldFor('email').autocomplete).toBe('email')
    expect(fieldFor('phone').autocomplete).toBe('tel')
  })
})

describe('permanent-address — Save and continue', () => {
  useStubbedJourney(SET_ID, dispatchPages)

  it('Should go to the consignment addresses page whether opened from its link or not', async () => {
    const seed = petConsignmentSeed(
      catLine([{ animalIdentifierMicrochip: 'MC-1' }])
    )
    const key = cardKeyFor(0, 0)

    const openedFromLink = await driveHandler(post, {
      seed,
      payload: optionPayload(key, 'newAddress'),
      query: { return: 'addresses' }
    })
    expect(openedFromLink.response.redirect).toBe(
      pagePath(openedFromLink.journeyId, addressesPage.slug)
    )

    const openedDirectly = await driveHandler(post, {
      seed,
      payload: optionPayload(key, 'newAddress')
    })
    expect(openedDirectly.response.redirect).toBe(
      withTrail(pagePath(openedDirectly.journeyId, addressesPage.slug), [
        'permanent-address'
      ])
    )
  })

  itSendsBackToWhereTheTraderCameFrom(get, {
    seed: petConsignmentSeed(catLine([{ animalIdentifierMicrochip: 'MC-1' }])),
    previousPage: 'addresses'
  })
})

describe('permanent-address — a refused save', () => {
  useStubbedJourney(SET_ID, dispatchPages)

  it('Should render the page again with status 500 and every entered value still shown, logging one save fallback', async () => {
    const seed = petConsignmentSeed(
      catLine([{ animalIdentifierMicrochip: 'MC-1' }])
    )
    const key = cardKeyFor(0, 0)
    const failure = unavailableBackendError('replaceFulfilment')

    const result = await driveHandler(post, {
      seed,
      payload: {
        ...optionPayload(key, 'newAddress'),
        ...newAddressPayload(key, { nameOrOrganisationName: 'Pet Owner' })
      },
      startingFrom: [refusingSaves(failure)]
    })

    expect(result.response.statusCode).toBe(500)
    const [, newAddressOption] = cardsFrom(result)[0].options
    expect(newAddressOption.checked).toBe(true)
    const [nameField] = cardsFrom(result)[0].addressFields
    expect(nameField.value).toBe('Pet Owner')
    expect(
      result.logger.entries.filter(
        ({ message }) =>
          message ===
          'Save failed on a recoverable backend error, fallback response sent'
      )
    ).toHaveLength(1)
  })
})
