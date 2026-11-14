import { expect, test } from '@playwright/test'
import {
  BASE,
  DESKTOP_VIEWPORT,
  BISON_BISON_ROW,
  BOS_TAURUS_ROW,
  FELIS_CATUS_ROW,
  PHONE_VIEWPORT,
  cannedPrivateTransporter,
  saveTransporterFromList,
  addPlaceOfDestination,
  answerPermanentAddressCard,
  chooseTypeAheadOption,
  chooseCountryOfOrigin,
  completeAnswerSections,
  expectNoSeriousOrCriticalViolations,
  expectStyle,
  govukVisuallyHiddenStyleOf,
  identifyAnimalsByMicrochip,
  journeyIdFromPage,
  journeyUrl,
  notificationViewUrl,
  numberOfAnimalsFor,
  openCommodityDetails,
  openNotificationView,
  openOverview,
  openPermanentAddressFromAddLink,
  openReviewFromHub,
  openReviewWithSpeciesCounts,
  partyPickerName,
  rowFor,
  saveAndContinue,
  signIn,
  startNotification,
  urlUnderBase,
  values
} from '../../../../../../../../../fit/live-animals-journey.js'
import { copy as importReasonCopy } from '../import-reason/copy/copy.en.js'
import { copy as dashboardCopy } from '../dashboard/copy/copy.en.js'
import { copy as declarationCopy } from '../declaration/copy/copy.en.js'
import { copy as deleteCopy } from '../delete-notification/copy/copy.en.js'
import { copy as addressesCopy } from '../addresses/copy/copy.en.js'
import { copy as contactCopy } from '../contact/copy/copy.en.js'
import { copy as transportCopy } from '../transport/copy/copy.en.js'
import { copy as sharedCopy } from '../../../../../../shared/copy.en.js'
import { copy } from './copy/copy.en.js'

const INTERNAL_REFERENCE_LABEL =
  'Your internal reference for this consignment (optional)'
const SAVE_AND_CONTINUE = 'Save and continue'
const ARRIVAL_DETAILS_ANCHOR = '#arrival-details'
const ORIGIN_OF_IMPORT_ANCHOR = '#origin-of-import'
const MAIN_IMPORT_REASON_ANCHOR = '#main-import-reason'
const TRANSPORT_DETAILS_ANCHOR = '#transport-details'
const ARRIVAL_DETAILS_ROW_LABELS = [
  copy.rows.portOfEntry,
  copy.rows.arrivalDate,
  copy.rows.meansOfTransport,
  copy.rows.transportIdentification,
  copy.rows.transportDocumentReference
]

const rowKeysOf = (page, cardAnchor) =>
  page.locator(`${cardAnchor} .govuk-summary-list__key`)

const answerCellFor = (page, label) =>
  rowFor(page, label).getByRole('definition').first()

const expectOnlyHiddenMissing = async (page, answerCell) => {
  await expect(answerCell).toHaveText(copy.missing)
  await expectStyle(
    answerCell.getByText(copy.missing, { exact: true }),
    await govukVisuallyHiddenStyleOf(page)
  )
}

const cardChangeLink = (page, hiddenText) =>
  page.getByRole('link', { name: `${copy.change} ${hiddenText}` })

const openOrigin = (page) =>
  page
    .getByRole('link', { name: 'Where is this consignment coming from?' })
    .click()

test.describe('check-answers feature summary rows', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('renders entered and missing answers in their summary rows', async ({
    page
  }) => {
    await startNotification(page)
    await openOrigin(page)
    await chooseCountryOfOrigin(page, 'France')
    await page.getByRole('radio', { name: 'Yes' }).check()
    await page
      .getByLabel('Enter the region of origin code', { exact: true })
      .fill('IDF75')
    await page.getByLabel(INTERNAL_REFERENCE_LABEL).fill('ReviewRef1')
    await page.getByRole('button', { name: SAVE_AND_CONTINUE }).click()

    await openNotificationView(page)

    await expect(page.getByRole('heading', { name: copy.title })).toBeVisible()
    await expect(
      page.getByRole('heading', {
        name: copy.sections.aboutTheConsignment
      })
    ).toBeVisible()
    await expect(rowFor(page, copy.rows.countryOfOrigin)).toContainText(
      'France'
    )
    await expect(rowKeysOf(page, ORIGIN_OF_IMPORT_ANCHOR)).toHaveText([
      copy.rows.countryOfOrigin,
      copy.rows.regionCode,
      copy.rows.internalReference
    ])
    await expect(rowFor(page, copy.rows.regionCode)).toContainText('FR-IDF75')
    await expect(rowFor(page, copy.rows.internalReference)).toContainText(
      'ReviewRef1'
    )
    await expectOnlyHiddenMissing(
      page,
      answerCellFor(page, copy.rows.arrivalDate)
    )
  })

  test('journey with only the entry page answered writes the settled blanks out and leaves the outstanding ones blank with a hidden Missing', async ({
    page
  }) => {
    await startNotification(page)
    await openNotificationView(page)

    await expect(rowFor(page, copy.rows.internalReference)).toContainText(
      sharedCopy.notApplicable
    )
    await expectOnlyHiddenMissing(
      page,
      answerCellFor(page, copy.rows.arrivalDate)
    )
    await expect(rowFor(page, copy.rows.arrivalDate)).not.toContainText(
      sharedCopy.notApplicable
    )
  })
})

test.describe('check-answers feature Permanent address subsection of the Addresses card', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('renders one entry per cat in the Addresses card Permanent address subsection, keyed by its common name and number, and heads its identification details with the identifiers alone', async ({
    page
  }) => {
    test.slow()
    await openCommodityDetails(page, [FELIS_CATUS_ROW])
    await (await numberOfAnimalsFor(page, FELIS_CATUS_ROW)).fill('2')
    await saveAndContinue(page).click()
    await identifyAnimalsByMicrochip(page, ['MICROCHIP-1', 'MICROCHIP-2'])

    await openOverview(page)
    await page.getByRole('link', { name: 'Roles and addresses' }).click()
    await addPlaceOfDestination(page)
    await openPermanentAddressFromAddLink(page)
    await expect(
      page.getByRole('heading', { name: 'Permanent address' })
    ).toBeVisible()
    await answerPermanentAddressCard(page, 'Felis catus 1')
    await answerPermanentAddressCard(page, 'Felis catus 2', {
      nameOrOrganisationName: 'Pet Owner',
      addressLine1: '1 Pet Lane',
      townOrCity: 'Leeds',
      postcode: 'LS1 1AA',
      email: 'pet@example.co.uk',
      phone: '0113 555 0192'
    })
    await saveAndContinue(page).click()

    await openOverview(page)
    await openReviewFromHub(page)
    await expect(page.getByRole('heading', { name: copy.title })).toBeVisible()

    const addressesCard = page.locator('#addresses')
    await expect(
      addressesCard.getByRole('heading', { name: 'Permanent address' })
    ).toBeVisible()
    const catOneEntry = addressesCard
      .locator('.govuk-summary-list__row', { hasText: 'Domestic Cat 1' })
      .getByRole('definition')
    await expect(catOneEntry).toHaveText(
      `${partyPickerName(values.placeOfDestination)} 18 Dockside Road London E14 9GE United Kingdom`,
      { useInnerText: true }
    )
    await expect(
      addressesCard.locator('.govuk-summary-list__row', {
        hasText: 'Domestic Cat 2'
      })
    ).toContainText('Pet Owner')

    const speciesBlock = page.locator('[id^="species-block-"]', {
      has: page.getByRole('heading', { name: 'Felis Catus', exact: true })
    })
    await expect(
      speciesBlock.getByRole('heading', {
        name: copy.identificationDetails.heading
      })
    ).toBeVisible()
    await expect(speciesBlock.getByRole('columnheader')).toHaveText([
      'Animal',
      'Microchip'
    ])
    await expect(speciesBlock.getByRole('cell').first()).toHaveText(
      'Felis catus 1'
    )
  })
})

test.describe('check-answers feature species blocks', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('groups two cattle species under one commodity card and names each one short of an identifier, linking to its block', async ({
    page
  }) => {
    test.slow()
    await openReviewWithSpeciesCounts(page, [
      { species: BOS_TAURUS_ROW, count: '1' },
      { species: BISON_BISON_ROW, count: '1' }
    ])

    await expect(
      page
        .getByRole('main')
        .getByRole('heading', { level: 3, name: BOS_TAURUS_ROW.commodityCode })
    ).toHaveCount(1)
    await expect(
      page.locator('[id^="species-block-"]').getByRole('heading', { level: 4 })
    ).toHaveText(['Bison Bison', 'Bos Taurus'])

    for (const [speciesName, heading] of [
      ['bos taurus', 'Bos Taurus'],
      ['bison bison', 'Bison Bison']
    ]) {
      await page
        .getByRole('link', {
          name: copy.errors.species.noIdentifier(speciesName)
        })
        .click()
      await expect(
        page.locator('[id^="species-block-"]:focus').getByRole('heading', {
          name: heading
        })
      ).toBeVisible()
    }
  })
})

test.describe('check-answers feature section structure', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('numbers the six sections in order', async ({ page }) => {
    await startNotification(page)
    await openNotificationView(page)

    await expect(
      page.getByRole('heading', { level: 2 }).filter({ hasText: /^\d\.\s/ })
    ).toHaveText([
      copy.sections.aboutTheConsignment,
      copy.sections.descriptionOfTheGoods,
      copy.sections.transportAndArrival,
      copy.sections.documents,
      copy.sections.consignmentAddresses,
      copy.sections.contactAddress
    ])
  })

  test('ends with the Continue button and nothing above it', async ({
    page
  }) => {
    await startNotification(page)
    await openNotificationView(page)

    await expect(
      page.getByRole('main').getByRole('heading', { level: 2 }).last()
    ).toHaveText(copy.sections.contactAddress)

    const lastBlock = page.getByRole('main').locator('form').last()
    await expect(lastBlock.locator('xpath=following-sibling::*')).toHaveCount(0)

    await expect(
      lastBlock
        .locator('xpath=preceding-sibling::*[1]')
        .getByRole('heading', { name: copy.cards.contactAddress, level: 3 })
    ).toBeVisible()

    await expect(
      lastBlock.getByRole('button', { name: copy.submit.button })
    ).toBeVisible()
  })

  test('puts every card title straight under its section heading, with no other heading between them', async ({
    page
  }) => {
    await startNotification(page)
    await openNotificationView(page)

    await expect(page.getByRole('main').getByRole('heading')).toHaveText([
      sharedCopy.errorSummary.title,
      copy.title,
      copy.sections.aboutTheConsignment,
      copy.cards.originOfImport,
      copy.cards.whatAreYouImporting,
      copy.cards.mainImportReason,
      copy.sections.descriptionOfTheGoods,
      copy.cards.additionalDetails,
      copy.sections.transportAndArrival,
      copy.cards.arrivalDetails,
      copy.cards.transportDetails,
      copy.sections.documents,
      copy.cards.documents,
      copy.sections.consignmentAddresses,
      copy.cards.addresses,
      copy.sections.contactAddress,
      copy.cards.contactAddress
    ])

    await expect(
      page.getByRole('main').getByRole('heading', { level: 1 })
    ).toHaveText([copy.title])
    await expect(
      page.getByRole('main').getByRole('heading', { level: 2 })
    ).toHaveText([
      sharedCopy.errorSummary.title,
      copy.sections.aboutTheConsignment,
      copy.sections.descriptionOfTheGoods,
      copy.sections.transportAndArrival,
      copy.sections.documents,
      copy.sections.consignmentAddresses,
      copy.sections.contactAddress
    ])
    await expect(
      page.getByRole('main').getByRole('heading', { level: 3 })
    ).toHaveText([
      copy.cards.originOfImport,
      copy.cards.whatAreYouImporting,
      copy.cards.mainImportReason,
      copy.cards.additionalDetails,
      copy.cards.arrivalDetails,
      copy.cards.transportDetails,
      copy.cards.documents,
      copy.cards.addresses,
      copy.cards.contactAddress
    ])
  })
})

test.describe('check-answers feature documents section', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('shows the documents section and a Change route with nothing uploaded', async ({
    page
  }) => {
    await startNotification(page)
    await openNotificationView(page)

    await expect(
      page.getByRole('heading', { name: copy.sections.documents })
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { name: copy.cards.documents, exact: true })
    ).toBeVisible()
    await expect(page.getByText(copy.documentsEmpty)).toBeVisible()

    const changeLink = cardChangeLink(page, copy.hidden.cards.documents)
    await expect(changeLink).toHaveAttribute(
      'href',
      /\/notifications\/[^/]+\/accompanying-documents\?from=(?:[^#]*%2C)?notification-view$/
    )

    await changeLink.click()

    await expect(page).toHaveURL(
      /\/accompanying-documents\?from=(?:[^#]*%2C)?notification-view$/
    )
  })
})

test.describe('check-answers feature exit answers', () => {
  const IMPORT_REASON_SLUG = 'import-reason'
  const EXIT_PORT_CODE = 'GB DVR'
  const EXIT_PORT_LABEL = 'Port of Dover - GB DVR'
  const DESTINATION_COUNTRY_NAME = 'Ireland'

  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('shows the exit border control post then the destination country a transit collected, with the one Change link in the card heading', async ({
    page
  }) => {
    await startNotification(page)
    await page.goto(journeyUrl(page, IMPORT_REASON_SLUG))
    await page.locator('input[name="reasonForImport"][value="transit"]').check()
    await chooseTypeAheadOption(page, {
      label: importReasonCopy.port.label,
      inputId: 'transitPortOfExit',
      query: EXIT_PORT_CODE,
      optionName: EXIT_PORT_LABEL
    })
    await chooseTypeAheadOption(page, {
      label: importReasonCopy.country.label,
      inputId: 'transitDestinationCountry',
      query: DESTINATION_COUNTRY_NAME,
      optionName: DESTINATION_COUNTRY_NAME
    })
    await page.getByRole('button', { name: SAVE_AND_CONTINUE }).click()

    await openNotificationView(page)

    await expect(rowKeysOf(page, MAIN_IMPORT_REASON_ANCHOR)).toHaveText([
      copy.rows.reasonForImport,
      copy.rows.exitBorderControlPost,
      copy.rows.destinationCountry
    ])
    await expect(rowFor(page, copy.rows.exitBorderControlPost)).toContainText(
      EXIT_PORT_LABEL
    )
    await expect(rowFor(page, copy.rows.destinationCountry)).toContainText(
      DESTINATION_COUNTRY_NAME
    )

    await expect(
      rowFor(page, copy.rows.destinationCountry).getByRole('link')
    ).toHaveCount(0)

    const changeLink = cardChangeLink(page, copy.hidden.cards.mainImportReason)
    await expect(changeLink).toHaveAttribute(
      'href',
      /\/notifications\/[^/]+\/import-reason\?from=(?:[^#]*%2C)?notification-view$/
    )

    await changeLink.click()

    await expect(page).toHaveURL(
      /\/import-reason\?from=(?:[^#]*%2C)?notification-view$/
    )
  })

  test('shows the exit date and port of exit a temporary admission collected', async ({
    page
  }) => {
    await startNotification(page)
    await page.goto(journeyUrl(page, IMPORT_REASON_SLUG))
    await page
      .locator(
        'input[name="reasonForImport"][value="temporaryAdmissionHorses"]'
      )
      .check()
    await page.locator('#temporaryAdmissionExitDate').fill('27/3/2026')
    await chooseTypeAheadOption(page, {
      label: importReasonCopy.port.label,
      inputId: 'temporaryAdmissionPortOfExit',
      query: EXIT_PORT_CODE,
      optionName: EXIT_PORT_LABEL
    })
    await page.getByRole('button', { name: SAVE_AND_CONTINUE }).click()

    await openNotificationView(page)

    await expect(rowFor(page, copy.rows.exitDate)).toContainText('27/3/2026')
    await expect(rowFor(page, copy.rows.portOfExit)).toContainText(
      EXIT_PORT_LABEL
    )
    await expect(
      page.getByText(copy.rows.destinationCountry, { exact: true })
    ).toHaveCount(0)
  })

  test('leaves all three rows off the review for a reason that asks none of them', async ({
    page
  }) => {
    await startNotification(page)
    await page.goto(journeyUrl(page, IMPORT_REASON_SLUG))
    await page.locator('input[name="reasonForImport"][value="reEntry"]').check()
    await page.getByRole('button', { name: SAVE_AND_CONTINUE }).click()

    await openNotificationView(page)

    for (const label of [
      copy.rows.destinationCountry,
      copy.rows.exitDate,
      copy.rows.portOfExit
    ]) {
      await expect(page.getByText(label, { exact: true })).toHaveCount(0)
    }
  })
})

test.describe('check-answers feature change links', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('Change link carries the change marker and Save and continue goes on to the next page', async ({
    page
  }) => {
    await startNotification(page)
    await openOrigin(page)
    await chooseCountryOfOrigin(page, 'France')
    await page.getByLabel(INTERNAL_REFERENCE_LABEL).fill('ReviewRef1')
    await page.getByRole('button', { name: SAVE_AND_CONTINUE }).click()
    await openNotificationView(page)

    const changeLink = cardChangeLink(page, copy.hidden.cards.originOfImport)
    await expect(changeLink).toHaveAttribute(
      'href',
      /\/notifications\/[^/]+\/origin\?from=(?:[^#]*%2C)?notification-view$/
    )

    await changeLink.click()

    await expect(page).toHaveURL(
      /\/origin\?from=(?:[^#]*%2C)?notification-view$/
    )
    await page.getByLabel(INTERNAL_REFERENCE_LABEL).clear()
    await page.getByRole('button', { name: SAVE_AND_CONTINUE }).click()

    await expect(page).toHaveURL(
      urlUnderBase('/notifications/[^/]+/commodities')
    )
    await openNotificationView(page)
    await expect(rowFor(page, copy.rows.internalReference)).toContainText(
      sharedCopy.notApplicable
    )
  })

  test('has one Change link per card, named for its card, in card order, and none on a row of a new notification', async ({
    page
  }) => {
    await startNotification(page)
    await openNotificationView(page)

    await expect(
      page.getByRole('link', { name: new RegExp(`^${copy.change}\\b`) })
    ).toHaveText(
      [
        copy.hidden.cards.originOfImport,
        copy.hidden.cards.whatAreYouImporting,
        copy.hidden.cards.mainImportReason,
        copy.hidden.cards.additionalDetails,
        copy.hidden.cards.arrivalDetails,
        copy.hidden.cards.transportDetails,
        copy.hidden.cards.documents,
        copy.hidden.cards.addresses,
        copy.hidden.cards.contactAddress
      ].map((hiddenText) => {
        const name = RegExp.escape(`${copy.change} ${hiddenText}`)
        return new RegExp(`^${name}( \\(.+\\))?$`)
      })
    )
  })

  test('opens the consignment addresses page from the Addresses card', async ({
    page
  }) => {
    await startNotification(page)
    await openNotificationView(page)

    const changeLink = cardChangeLink(page, copy.hidden.cards.addresses)
    await expect(changeLink).toHaveAttribute('href', /\/addresses\?from=/)
    await changeLink.click()

    await expect(
      page.getByRole('heading', { level: 1, name: addressesCopy.hub.title })
    ).toBeVisible()
  })

  test('opens the contact address page from the contact address card', async ({
    page
  }) => {
    await startNotification(page)
    await openNotificationView(page)

    const changeLink = cardChangeLink(page, copy.hidden.cards.contactAddress)
    await expect(changeLink).toHaveAttribute(
      'href',
      /\/consignment\/contact\/select\?from=/
    )
    await changeLink.click()

    await expect(
      page.getByRole('heading', { level: 1, name: contactCopy.title })
    ).toBeVisible()
  })
})

test.describe('check-answers feature navigation and submission', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('back link returns to the notification hub', async ({ page }) => {
    await startNotification(page)
    const hubUrl = journeyUrl(page)
    await openNotificationView(page)

    await page.getByRole('link', { name: 'Back', exact: true }).click()

    await expect(page).toHaveURL(hubUrl)
  })

  test('review has no serious or critical axe violations', async ({ page }) => {
    await startNotification(page)
    await openNotificationView(page)

    await expectNoSeriousOrCriticalViolations(page, 'Check answers')
  })

  test('new journey shows no address error before a role has been answered', async ({
    page
  }) => {
    await startNotification(page)
    await openNotificationView(page)

    await expectOnlyHiddenMissing(
      page,
      answerCellFor(page, copy.rows.consignor)
    )
    await expect(
      page.getByRole('link', { name: copy.errors.parties.consignor })
    ).toBeHidden()
  })

  test('a draft by road with no transit country added continues to the declaration', async ({
    page
  }) => {
    test.slow()
    await startNotification(page)
    await completeAnswerSections(page, { skipTransitCountries: true })
    await openReviewFromHub(page)

    await expect(answerCellFor(page, copy.rows.transitedCountries)).toHaveText(
      sharedCopy.notApplicable
    )
    await expect(
      page
        .locator(ARRIVAL_DETAILS_ANCHOR)
        .getByText(copy.errors.cards.arrivalDetails)
    ).toHaveCount(0)

    await page.getByRole('button', { name: copy.submit.button }).click()

    await expect(
      page.getByRole('heading', { level: 1, name: declarationCopy.title })
    ).toBeVisible()
  })

  test('reads the transit countries inside the arrival details card, with a Change link that opens the transit countries page', async ({
    page
  }) => {
    test.slow()
    await startNotification(page)
    await completeAnswerSections(page)
    await openReviewFromHub(page)

    const arrivalDetails = page.locator(ARRIVAL_DETAILS_ANCHOR)
    await expect(
      arrivalDetails.getByRole('heading', {
        level: 4,
        name: copy.groups.transitCountries
      })
    ).toBeVisible()
    await expect(answerCellFor(page, copy.rows.transitedCountries)).toHaveText(
      'France, Belgium'
    )

    const changeLink = arrivalDetails.getByRole('link', {
      name: `${copy.change} ${copy.hidden.rows.transitCountries}`
    })
    await expect(changeLink).toHaveAttribute(
      'href',
      /\/transit-countries\?from=(?:[^#]*%2C)?notification-view$/
    )
    await changeLink.click()

    await expect(
      page.getByRole('heading', {
        level: 1,
        name: transportCopy.transitCountries.title
      })
    ).toBeVisible()
  })

  test('shows Not applicable on the approval number of a saved private transporter that has none, and its stored country', async ({
    page
  }) => {
    await startNotification(page)
    await saveTransporterFromList(page, cannedPrivateTransporter)
    await openNotificationView(page)

    await expect(rowKeysOf(page, TRANSPORT_DETAILS_ANCHOR)).toHaveText([
      copy.rows.name,
      copy.rows.address,
      copy.rows.country,
      copy.rows.approvalNumber,
      copy.rows.type
    ])
    await expect(answerCellFor(page, copy.rows.country)).toHaveText(
      cannedPrivateTransporter.address.country
    )
    await expect(answerCellFor(page, copy.rows.approvalNumber)).toHaveText(
      sharedCopy.notApplicable
    )
  })
})

test.describe('check-answers feature unfinished notification', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('leaves every blank answer of an unfinished card blank with a hidden Missing', async ({
    page
  }) => {
    await startNotification(page)
    await openNotificationView(page)

    const card = page.locator(ARRIVAL_DETAILS_ANCHOR)

    await expect(card.getByText(sharedCopy.notApplicable)).toHaveCount(0)
    for (const label of ARRIVAL_DETAILS_ROW_LABELS) {
      await expectOnlyHiddenMissing(page, answerCellFor(page, label))
    }
  })

  test('shows the unfinished card with its Complete line and leaves the blank answer with a hidden Missing after a refused Continue at desktop and phone width', async ({
    page
  }) => {
    await startNotification(page)
    const reviewUrl = notificationViewUrl(page)
    await page.goto(reviewUrl)
    await page.getByRole('button', { name: copy.submit.button }).click()
    await expect(page).toHaveURL(`${reviewUrl}?refused=1`)

    for (const viewport of [DESKTOP_VIEWPORT, PHONE_VIEWPORT]) {
      await page.setViewportSize(viewport)
      await expect(
        page
          .locator(`${ARRIVAL_DETAILS_ANCHOR} .govuk-error-message`)
          .getByText(copy.errors.cards.arrivalDetails)
      ).toBeVisible()
      await expectOnlyHiddenMissing(
        page,
        answerCellFor(page, copy.rows.arrivalDate)
      )
    }
  })

  test('names every unfinished card in the error summary and shows its error message on the card', async ({
    page
  }) => {
    await startNotification(page)
    await openNotificationView(page)

    await expect(
      page.getByRole('heading', { name: sharedCopy.errorSummary.title })
    ).toBeVisible()
    const entry = page.getByRole('link', {
      name: copy.errors.cards.arrivalDetails
    })
    await expect(entry).toHaveAttribute('href', ARRIVAL_DETAILS_ANCHOR)
    await expect(
      page
        .locator(ARRIVAL_DETAILS_ANCHOR)
        .getByText(copy.errors.cards.arrivalDetails)
    ).toBeVisible()
    await expect(
      page.locator(`${ARRIVAL_DETAILS_ANCHOR} .govuk-error-message`)
    ).toContainText(copy.errors.prefix)
  })

  test('names the unfinished main import reason and additional details cards in the error summary and on each card', async ({
    page
  }) => {
    await startNotification(page)
    await openNotificationView(page)

    for (const { message, anchor } of [
      {
        message: copy.errors.cards.mainImportReason,
        anchor: '#main-import-reason'
      },
      {
        message: copy.errors.cards.additionalDetails,
        anchor: '#additional-details'
      }
    ]) {
      await expect(page.getByRole('link', { name: message })).toHaveAttribute(
        'href',
        anchor
      )
      await expect(page.locator(anchor).getByText(message)).toBeVisible()
    }
  })

  test('refuses Continue and keeps the trader on the review page', async ({
    page
  }) => {
    await startNotification(page)
    const reviewUrl = notificationViewUrl(page)
    await page.goto(reviewUrl)

    await page.getByRole('button', { name: copy.submit.button }).click()

    await expect(page).toHaveURL(`${reviewUrl}?refused=1`)
    await expect(
      page.getByRole('heading', { name: sharedCopy.errorSummary.title })
    ).toBeVisible()
  })

  test('refuses submit of a notification with no commodity line and names what is missing from the commodity selection and the commodity details', async ({
    page
  }) => {
    await startNotification(page)
    const reviewUrl = notificationViewUrl(page)
    await page.goto(reviewUrl)

    await page.getByRole('button', { name: copy.submit.button }).click()

    await expect(page).toHaveURL(`${reviewUrl}?refused=1`)
    const importingEntry = page.getByRole('link', {
      name: copy.errors.cards.whatAreYouImporting
    })
    await expect(importingEntry).toHaveAttribute(
      'href',
      '#what-are-you-importing'
    )
    await expect(page.locator('#what-are-you-importing')).toContainText(
      copy.errors.cards.whatAreYouImporting
    )
    await expect(
      page.getByRole('link', { name: copy.errors.cards.commodityDetails })
    ).toHaveAttribute('href', '#description-of-the-goods')
  })

  test('unfinished review has no serious or critical axe violations', async ({
    page
  }) => {
    await startNotification(page)
    await openNotificationView(page)
    await page.getByRole('button', { name: copy.submit.button }).click()

    await expectNoSeriousOrCriticalViolations(page, 'Unfinished check answers')
  })
})

test.describe('check-answers feature submitted notification', () => {
  test.describe.configure({ timeout: 90000 })

  test.beforeEach(async ({ page }) => {
    await signIn(page)
    await startNotification(page)
    await completeAnswerSections(page)
    await openReviewFromHub(page)
    await page.getByRole('button', { name: copy.submit.button }).click()
    await page
      .getByRole('checkbox', { name: /I confirm that I have reviewed/ })
      .check()
    await page.getByRole('button', { name: 'Continue' }).click()
    const reference = journeyIdFromPage(page)
    await page.goto(BASE)
    await page
      .getByRole('link', {
        name: `View ${dashboardCopy.actionHidden(reference)}`
      })
      .click()
    await expect(page.getByRole('heading', { name: copy.title })).toBeVisible()
  })

  test('ends with the last card and offers no way to submit again', async ({
    page
  }) => {
    await expect(
      page.getByRole('button', {
        name: sharedCopy.notificationActions.copy.text
      })
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: copy.submit.button })
    ).toHaveCount(0)
  })

  test('submitted review has no serious or critical axe violations', async ({
    page
  }) => {
    await expectNoSeriousOrCriticalViolations(page, 'Submitted check answers')
  })

  test('Delete on the submitted view opens the delete confirmation', async ({
    page
  }) => {
    await page
      .getByRole('button', {
        name: sharedCopy.notificationActions.delete.text,
        exact: true
      })
      .click()

    await expect(
      page.getByRole('heading', { level: 1, name: deleteCopy.title })
    ).toBeVisible()
  })
})
