import { expect, test } from '@playwright/test'
import {
  BOS_TAURUS_ROW,
  FELIS_CATUS_ROW,
  MUSTELA_PUTORIUS_FURO_ROW,
  addPlaceOfDestination,
  addressesSection,
  answerPermanentAddressCard,
  expectNoSeriousOrCriticalViolations,
  expectPageEndsWithPrimaryAlone,
  numberOfAnimalsFor,
  openCommodityDetails,
  openPermanentAddressFromAddLink,
  saveAndContinue,
  saveAndReturnToHub,
  signIn
} from '../../../../../../../../../fit/live-animals-journey.js'
import { copy } from './copy/copy.en.js'
import { copy as hubCopy } from '../hub/copy/copy.en.js'
import { copy as addressesCopy } from '../addresses/copy/copy.en.js'

const CAT_1 = 'Felis catus 1'
const CAT_2 = 'Felis catus 2'
const FERRET_1 = 'Mustela putorius furo 1'

const MICROCHIP_FIELD = '#animalIdentifierMicrochip-0'
const FERRET_MICROCHIP_FIELD = '#animalIdentifierMicrochip-1'
const CAT_MICROCHIP = 'MICROCHIP-1'
const FERRET_MICROCHIP = 'MICROCHIP-2'
const NEW_ADDRESS_OPTION = 'Enter a new address'
const PLACE_OF_DESTINATION_OPTION = 'Same as the place of destination (POD)'
const NAME_OR_ORGANISATION_LABEL = 'Name or organisation name'

const fillOneCatAndOneFerretIdentifiers = async (page) => {
  await openCommodityDetails(page, [FELIS_CATUS_ROW, MUSTELA_PUTORIUS_FURO_ROW])
  await (await numberOfAnimalsFor(page, FELIS_CATUS_ROW)).fill('1')
  await (await numberOfAnimalsFor(page, MUSTELA_PUTORIUS_FURO_ROW)).fill('1')
  await saveAndContinue(page).click()
  await page.locator(MICROCHIP_FIELD).fill(CAT_MICROCHIP)
  await page.locator(FERRET_MICROCHIP_FIELD).fill(FERRET_MICROCHIP)
}

const goToAddressesHub = async (page) => {
  await saveAndReturnToHub(page).click()
  await page.getByRole('link', { name: hubCopy.rows.addresses.title }).click()
}

const openPermanentAddressFromAddressesHub = async (page) => {
  await openPermanentAddressFromAddLink(page)
  await expect(page.getByRole('heading', { name: copy.title })).toBeVisible()
}

const openPermanentAddressFromHub = async (page) => {
  await goToAddressesHub(page)
  await openPermanentAddressFromAddressesHub(page)
}

const openOnePerSpeciesPermanentAddress = async (page) => {
  await fillOneCatAndOneFerretIdentifiers(page)
  await openPermanentAddressFromHub(page)
}

test.describe('permanent address', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('renders its chrome, the fraud warning, and a card per animal with its identifiers and both options', async ({
    page
  }) => {
    await openOnePerSpeciesPermanentAddress(page)

    await expect(
      page.locator('span.govuk-caption-l + h1.govuk-heading-l')
    ).toHaveText(copy.title)
    await expect(page).toHaveTitle(
      'Permanent address - Import notification service - GOV.UK'
    )
    await expect(page.getByText(copy.warning)).toBeVisible()

    for (const [heading, chip] of [
      [CAT_1, CAT_MICROCHIP],
      [FERRET_1, FERRET_MICROCHIP]
    ]) {
      const card = page.getByRole('region', { name: heading, exact: true })
      await expect(card.getByText(`Microchip: ${chip}`)).toBeVisible()
      await expect(
        card.getByRole('radio', { name: PLACE_OF_DESTINATION_OPTION })
      ).not.toBeChecked()
      await expect(
        card.getByRole('radio', { name: NEW_ADDRESS_OPTION })
      ).not.toBeChecked()
    }
  })

  test("reveals only the chosen animal's address fields, in order, with no country field, when Enter a new address is chosen", async ({
    page
  }) => {
    await openOnePerSpeciesPermanentAddress(page)

    const catCard = page.getByRole('region', { name: CAT_1, exact: true })
    await catCard.getByRole('radio', { name: NEW_ADDRESS_OPTION }).check()

    await expect(catCard.getByLabel(NAME_OR_ORGANISATION_LABEL)).toBeVisible()
    const labels = await catCard
      .getByRole('textbox')
      .evaluateAll((inputs) =>
        inputs.map((input) => input.labels[0].textContent.trim())
      )
    expect(labels).toEqual([
      NAME_OR_ORGANISATION_LABEL,
      'Address line 1',
      'Address line 2 (optional)',
      'Town or city',
      'County (optional)',
      'Postcode or Zip code',
      'Email address',
      'Phone number'
    ])
    await expect(
      catCard.getByLabel('Phone number')
    ).toHaveAccessibleDescription(
      'For international numbers include the country code'
    )
    await expect(catCard.locator('select')).toHaveCount(0)
    await expect(
      page
        .getByRole('region', { name: FERRET_1, exact: true })
        .getByLabel(NAME_OR_ORGANISATION_LABEL)
    ).toBeHidden()
  })

  test('ends with the primary save control alone, returning to the consignment addresses page', async ({
    page
  }) => {
    await openOnePerSpeciesPermanentAddress(page)

    await expectPageEndsWithPrimaryAlone(page)
    await saveAndContinue(page).click()
    await expect(
      page.getByRole('heading', { name: addressesCopy.hub.title })
    ).toBeVisible()
  })

  test('back link returns to the consignment addresses page', async ({
    page
  }) => {
    await openOnePerSpeciesPermanentAddress(page)

    await page.getByRole('link', { name: 'Back', exact: true }).click()

    await expect(
      page.getByRole('heading', { name: addressesCopy.hub.title })
    ).toBeVisible()
  })

  test('saves each animal with its own hand-entered address, and reopens with each one selected and its own values back', async ({
    page
  }) => {
    await openOnePerSpeciesPermanentAddress(page)

    await answerPermanentAddressCard(page, CAT_1, {
      nameOrOrganisationName: 'Cat Owner',
      addressLine1: '1 Cat Lane',
      townOrCity: 'Leeds',
      postcode: 'LS1 1AA',
      email: 'cat@example.co.uk',
      phone: '0113 555 0192'
    })
    await answerPermanentAddressCard(page, FERRET_1, {
      nameOrOrganisationName: 'Ferret Owner',
      addressLine1: '1 Farm Lane',
      townOrCity: 'Skipton',
      county: 'North Yorkshire',
      postcode: 'BD23 1UD',
      email: 'owner@example.co.uk',
      phone: '+44 1756 555 0192'
    })
    await saveAndContinue(page).click()

    await expect(
      page.getByRole('heading', { name: addressesCopy.hub.title })
    ).toBeVisible()
    await addressesSection(page, addressesCopy.hub.permanentAddress.title)
      .getByRole('link', { name: addressesCopy.hub.change })
      .click()
    await expect(page.getByRole('heading', { name: copy.title })).toBeVisible()

    const catCard = page.getByRole('region', { name: CAT_1, exact: true })
    await expect(
      catCard.getByRole('radio', { name: NEW_ADDRESS_OPTION })
    ).toBeChecked()
    await expect(catCard.getByLabel(NAME_OR_ORGANISATION_LABEL)).toHaveValue(
      'Cat Owner'
    )
    const ferretCard = page.getByRole('region', { name: FERRET_1, exact: true })
    await expect(
      ferretCard.getByRole('radio', { name: NEW_ADDRESS_OPTION })
    ).toBeChecked()
    await expect(ferretCard.getByLabel(NAME_OR_ORGANISATION_LABEL)).toHaveValue(
      'Ferret Owner'
    )
    await expect(ferretCard.getByLabel('County (optional)')).toHaveValue(
      'North Yorkshire'
    )
  })

  test('has no serious or critical axe violations as first opened and with a reveal open', async ({
    page
  }) => {
    await openOnePerSpeciesPermanentAddress(page)
    await expectNoSeriousOrCriticalViolations(page, 'Permanent address')

    await page
      .getByRole('region', { name: CAT_1, exact: true })
      .getByRole('radio', { name: NEW_ADDRESS_OPTION })
      .check()
    await expectNoSeriousOrCriticalViolations(
      page,
      'Permanent address with a reveal open'
    )
  })
})

const openOnePerSpeciesPermanentAddressWithPlaceOfDestinationKnown = async (
  page
) => {
  await fillOneCatAndOneFerretIdentifiers(page)
  await goToAddressesHub(page)
  await addPlaceOfDestination(page)
  await openPermanentAddressFromAddressesHub(page)
}

test.describe('permanent address — place of destination and partial answers', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('hints the place-of-destination option with that address on one line, and reopens with it checked once chosen', async ({
    page
  }) => {
    await openOnePerSpeciesPermanentAddressWithPlaceOfDestinationKnown(page)

    const catCard = page.getByRole('region', { name: CAT_1, exact: true })
    await expect(
      catCard.getByRole('radio', { name: PLACE_OF_DESTINATION_OPTION })
    ).toHaveAccessibleDescription(
      'Tech Imports Ltd, 18 Dockside Road, London, E14 9GE, United Kingdom'
    )

    await catCard
      .getByRole('radio', { name: PLACE_OF_DESTINATION_OPTION })
      .check()
    await saveAndContinue(page).click()

    await page
      .getByRole('link', { name: addressesCopy.hub.permanentAddress.add })
      .click()
    const reopenedCard = page.getByRole('region', { name: CAT_1, exact: true })
    await expect(
      reopenedCard.getByRole('radio', { name: PLACE_OF_DESTINATION_OPTION })
    ).toBeChecked()
  })

  test("leaves one animal unanswered, saves the other and reopens with that animal's place-of-destination choice checked while the unanswered one has neither option checked", async ({
    page
  }) => {
    await openOnePerSpeciesPermanentAddressWithPlaceOfDestinationKnown(page)

    await answerPermanentAddressCard(page, CAT_1)
    await saveAndContinue(page).click()

    await expect(
      page.getByRole('link', { name: addressesCopy.hub.permanentAddress.add })
    ).toBeVisible()

    await page
      .getByRole('link', { name: addressesCopy.hub.permanentAddress.add })
      .click()

    const catCard = page.getByRole('region', { name: CAT_1, exact: true })
    await expect(
      catCard.getByRole('radio', { name: PLACE_OF_DESTINATION_OPTION })
    ).toBeChecked()
    const ferretCard = page.getByRole('region', { name: FERRET_1, exact: true })
    await expect(
      ferretCard.getByRole('radio', { name: PLACE_OF_DESTINATION_OPTION })
    ).not.toBeChecked()
    await expect(
      ferretCard.getByRole('radio', { name: NEW_ADDRESS_OPTION })
    ).not.toBeChecked()
  })
})

test.describe('permanent address — multiple animals of one species', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('shows three cards for a cat line of two and a ferret line of one', async ({
    page
  }) => {
    await openCommodityDetails(page, [
      FELIS_CATUS_ROW,
      MUSTELA_PUTORIUS_FURO_ROW
    ])
    await (await numberOfAnimalsFor(page, FELIS_CATUS_ROW)).fill('2')
    await (await numberOfAnimalsFor(page, MUSTELA_PUTORIUS_FURO_ROW)).fill('1')
    await saveAndContinue(page).click()
    await page.locator(MICROCHIP_FIELD).fill(CAT_MICROCHIP)
    await page.getByRole('button', { name: 'Save and add another' }).click()
    await page.locator(MICROCHIP_FIELD).fill(FERRET_MICROCHIP)
    await page.getByRole('button', { name: 'Save and finish' }).click()
    await page.locator('#animalIdentifierMicrochip-1').fill('MICROCHIP-3')
    await openPermanentAddressFromHub(page)

    await expect(
      page.getByRole('region', { name: CAT_1, exact: true })
    ).toBeVisible()
    await expect(
      page.getByRole('region', { name: CAT_2, exact: true })
    ).toBeVisible()
    await expect(
      page.getByRole('region', { name: FERRET_1, exact: true })
    ).toBeVisible()
  })
})

test.describe('permanent address — no animal needs one', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('sends a cattle consignment straight to the consignment addresses page and offers no add link', async ({
    page
  }) => {
    await openCommodityDetails(page, [BOS_TAURUS_ROW])
    await (await numberOfAnimalsFor(page, BOS_TAURUS_ROW)).fill('1')
    await saveAndContinue(page).click()
    await page.locator('#animalIdentifierEarTag-0').fill('UK123456789012')
    await saveAndReturnToHub(page).click()
    await page.getByRole('link', { name: hubCopy.rows.addresses.title }).click()

    await expect(
      page.getByRole('link', { name: addressesCopy.hub.permanentAddress.add })
    ).toHaveCount(0)

    const addressesUrl = page.url()
    await page.goto(
      addressesUrl.replace(/\/addresses(?:\?.*)?$/, '/permanent-address')
    )
    await expect(
      page.getByRole('heading', { name: addressesCopy.hub.title })
    ).toBeVisible()
  })
})
