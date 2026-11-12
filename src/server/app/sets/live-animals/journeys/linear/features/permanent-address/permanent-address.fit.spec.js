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
  identifyAnimalsByMicrochip,
  numberOfAnimalsFor,
  openCommodityDetails,
  openPermanentAddressFromAddLink,
  saveAndContinue,
  saveAndReturnToHub,
  signIn
} from '../../../../../../../../../fit/live-animals-journey.js'
import { copy } from './copy/copy.en.js'
import { copy as sharedCopy } from '../../../../../../shared/copy.en.js'
import { copy as hubCopy } from '../hub/copy/copy.en.js'
import { copy as addressesCopy } from '../addresses/copy/copy.en.js'

const { errorTitlePrefix, serviceName, govukSuffix } = sharedCopy.layout

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
const FERRET_OWNER_NAME = 'Ferret Owner'

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

  test('saves each animal with its own hand-entered address, counts the two animals on the consignment addresses page, and reopens with each one selected and its own values back', async ({
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
      nameOrOrganisationName: FERRET_OWNER_NAME,
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
    const permanentAddressSection = addressesSection(
      page,
      addressesCopy.hub.permanentAddress.title
    )
    await expect(
      permanentAddressSection.getByText(
        addressesCopy.hub.permanentAddress.addedForAnimals(2)
      )
    ).toBeVisible()
    await permanentAddressSection
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
      FERRET_OWNER_NAME
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

  test('shows that one address once, with a Change link, when a cat and a ferret are both saved against the place of destination', async ({
    page
  }) => {
    await openOnePerSpeciesPermanentAddressWithPlaceOfDestinationKnown(page)

    await answerPermanentAddressCard(page, CAT_1)
    await answerPermanentAddressCard(page, FERRET_1)
    await saveAndContinue(page).click()

    const permanentAddressSection = addressesSection(
      page,
      addressesCopy.hub.permanentAddress.title
    )
    await expect(
      permanentAddressSection.getByText('Tech Imports Ltd')
    ).toBeVisible()
    await expect(
      permanentAddressSection.getByText('18 Dockside Road')
    ).toBeVisible()
    await expect(
      permanentAddressSection.getByRole('link', {
        name: addressesCopy.hub.change
      })
    ).toHaveCount(1)
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
    await identifyAnimalsByMicrochip(page, [CAT_MICROCHIP, FERRET_MICROCHIP])
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

const fieldErrorMessage = async (card, label) => {
  const fieldId = await card
    .getByLabel(label, { exact: true })
    .getAttribute('id')
  return card.locator(`#${fieldId}-error`)
}

test.describe('permanent address — validation', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('refuses a blank new address on one card, naming the animal in the summary, leaving the field message plain, with the error-prefixed title', async ({
    page
  }) => {
    await openOnePerSpeciesPermanentAddress(page)

    await answerPermanentAddressCard(page, CAT_1, {})
    await saveAndContinue(page).click()

    const summary = page.getByRole('alert')
    await expect(
      summary.getByRole('heading', { name: 'There is a problem' })
    ).toBeVisible()

    const expectedOrder = [
      copy.errors.forAnimal(copy.errors.nameOrOrganisationName, CAT_1),
      copy.errors.forAnimal(copy.errors.addressLine1, CAT_1),
      copy.errors.forAnimal(copy.errors.townOrCity, CAT_1),
      copy.errors.forAnimal(copy.errors.postcode, CAT_1),
      copy.errors.forAnimal(copy.errors.email, CAT_1),
      copy.errors.forAnimal(copy.errors.phone, CAT_1)
    ]
    await expect(summary.getByRole('link')).toHaveText(expectedOrder)

    const catCard = page.getByRole('region', { name: CAT_1, exact: true })
    await summary.getByRole('link', { name: expectedOrder[0] }).click()
    const nameField = catCard.getByLabel(NAME_OR_ORGANISATION_LABEL)
    await expect(nameField).toBeFocused()
    await expect(
      await fieldErrorMessage(catCard, NAME_OR_ORGANISATION_LABEL)
    ).toHaveText(`Error: ${copy.errors.nameOrOrganisationName}`)

    await expect(page).toHaveTitle(
      `${errorTitlePrefix}${copy.title} - ${serviceName} - ${govukSuffix}`
    )
  })

  test('refuses the same-as-destination choice before one exists, and the summary link moves focus to the first radio', async ({
    page
  }) => {
    await openOnePerSpeciesPermanentAddress(page)

    await answerPermanentAddressCard(page, CAT_1)
    await saveAndContinue(page).click()

    const summary = page.getByRole('alert')
    const summaryLink = summary.getByRole('link', {
      name: copy.errors.placeOfDestinationUnknown
    })
    await expect(summaryLink).toBeVisible()

    const catCard = page.getByRole('region', { name: CAT_1, exact: true })
    await expect(
      catCard.getByText(copy.errors.placeOfDestinationUnknown)
    ).toBeVisible()

    await summaryLink.click()
    await expect(
      catCard.getByRole('radio', { name: PLACE_OF_DESTINATION_OPTION })
    ).toBeFocused()
  })

  test('keeps the other card answered and revealed after a refusal on the first', async ({
    page
  }) => {
    await openOnePerSpeciesPermanentAddress(page)

    await answerPermanentAddressCard(page, CAT_1, {})
    await answerPermanentAddressCard(page, FERRET_1, {
      nameOrOrganisationName: FERRET_OWNER_NAME,
      addressLine1: '1 Ferret Lane',
      townOrCity: 'York',
      postcode: 'YO1 1AA',
      email: 'ferret@example.co.uk',
      phone: '01904 555019'
    })
    await saveAndContinue(page).click()

    const ferretCard = page.getByRole('region', { name: FERRET_1, exact: true })
    await expect(
      ferretCard.getByRole('radio', { name: NEW_ADDRESS_OPTION })
    ).toBeChecked()
    await expect(ferretCard.getByLabel(NAME_OR_ORGANISATION_LABEL)).toHaveValue(
      FERRET_OWNER_NAME
    )
    await expect(ferretCard.getByLabel('Town or city')).toHaveValue('York')
  })

  test('has no serious or critical axe violations in the refused state', async ({
    page
  }) => {
    await openOnePerSpeciesPermanentAddress(page)

    await answerPermanentAddressCard(page, CAT_1, {})
    await saveAndContinue(page).click()

    await expectNoSeriousOrCriticalViolations(page, 'Permanent address refused')
  })
})

test.describe('permanent address validation without JavaScript', () => {
  test.use({ javaScriptEnabled: false })

  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('shows the summary and each field message, with the chosen option still revealed', async ({
    page
  }) => {
    await openOnePerSpeciesPermanentAddress(page)

    await answerPermanentAddressCard(page, CAT_1, {})
    await saveAndContinue(page).click()

    const summary = page.getByRole('alert')
    await expect(summary.getByRole('link')).toHaveCount(6)

    const catCard = page.getByRole('region', { name: CAT_1, exact: true })
    await expect(catCard.getByLabel(NAME_OR_ORGANISATION_LABEL)).toBeVisible()
    await expect(
      await fieldErrorMessage(catCard, NAME_OR_ORGANISATION_LABEL)
    ).toHaveText(`Error: ${copy.errors.nameOrOrganisationName}`)
  })
})

test.describe('permanent address — no animal identified yet', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('shows the no-animals message in place of the cards, and a save from there changes nothing and returns to the consignment addresses page', async ({
    page
  }) => {
    await openCommodityDetails(page, [FELIS_CATUS_ROW])
    await (await numberOfAnimalsFor(page, FELIS_CATUS_ROW)).fill('1')
    await saveAndContinue(page).click()
    await saveAndReturnToHub(page).click()
    await page.getByRole('link', { name: hubCopy.rows.addresses.title }).click()
    await page
      .getByRole('link', { name: addressesCopy.hub.permanentAddress.add })
      .click()
    await expect(page.getByRole('heading', { name: copy.title })).toBeVisible()

    await expect(page.getByRole('region', { name: CAT_1 })).toHaveCount(0)
    const noAnimalsIdentifiedMessage = page.getByText(
      `${copy.noAnimalsIdentified.before}${copy.noAnimalsIdentified.linkText}${copy.noAnimalsIdentified.after}`
    )
    await expect(noAnimalsIdentifiedMessage).toBeVisible()

    await page
      .getByRole('link', { name: copy.noAnimalsIdentified.linkText })
      .click()
    await expect(page).toHaveURL(
      /\/notifications\/[^/]+\/consignment-details(?:\?.*)?$/
    )

    await page.goBack()
    await saveAndContinue(page).click()
    await expect(
      page.getByRole('heading', { name: addressesCopy.hub.title })
    ).toBeVisible()

    await page
      .getByRole('link', { name: addressesCopy.hub.permanentAddress.add })
      .click()
    await expect(page.getByRole('heading', { name: copy.title })).toBeVisible()
    await expect(page.getByRole('region', { name: CAT_1 })).toHaveCount(0)
    await expect(noAnimalsIdentifiedMessage).toBeVisible()
  })
})
