import { expect, test } from '@playwright/test'
import {
  addDocument,
  amendFromList,
  backLink,
  changeOriginOnAmendment,
  deleteFromReview,
  openDocuments,
  submitCompleteNotification,
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
  expectDraftReview,
  expectDraftReviewEndsWithContinue,
  journeyIdFromPage,
  journeyStripTag,
  journeyUrl,
  notificationViewUrl,
  numberOfAnimalsFor,
  documentNamed,
  reviewCardFor,
  viewHeaderTag,
  formControls,
  reviewFootControls,
  INFECTED_DOCUMENT_FILE_NAME,
  STILL_SCANNING_DOCUMENT_FILE_NAME,
  expectMainImportReasonAndAdditionalDetailsNamed,
  expectOverview,
  openCommodityDetails,
  openFromOverviewRow,
  openNotificationView,
  documentRowFor,
  errorSummaryLinks,
  openOverview,
  openPermanentAddressFromAddLink,
  openReviewFromHub,
  openReviewWithSpeciesCounts,
  partyPickerName,
  rowFor,
  saveAndContinue,
  saveAndReturnToHub,
  signIn,
  startNotification,
  unlockSections,
  urlUnderBase,
  values,
  withoutJavaScript
} from '../../../../../../../../../fit/live-animals-journey.js'
import { copy as importReasonCopy } from '../import-reason/copy/copy.en.js'
import { copy as dashboardCopy } from '../dashboard/copy/copy.en.js'
import { copy as hubCopy } from '../hub/copy/copy.en.js'
import { copy as documentsCopy } from '../documents/copy/copy.en.js'
import { copy as declarationCopy } from '../declaration/copy/copy.en.js'
import { copy as deleteCopy } from '../delete-notification/copy/copy.en.js'
import { copy as cancelAmendCopy } from '../cancel-amend/copy/copy.en.js'
import { copy as addressesCopy } from '../addresses/copy/copy.en.js'
import { copy as contactCopy } from '../contact/copy/copy.en.js'
import { copy as transportCopy } from '../transport/copy/copy.en.js'
import { copy as sharedCopy } from '../../../../../../shared/copy.en.js'
import { formatMomentAsLongDay } from '../../../../../../lib/validate/index.js'
import { copy } from './copy/copy.en.js'

const SPECIES_BLOCK_SELECTOR = '[id^="species-block-"]'
const BISON_BISON_HEADING = 'Bison bison'
const BOS_TAURUS_HEADING = 'Bos taurus'
const FELIS_CATUS_HEADING = 'Felis catus'
const INTERNAL_REFERENCE_LABEL =
  'Your internal reference for this consignment (optional)'
const SAVE_AND_CONTINUE = 'Save and continue'
const ARRIVAL_DETAILS_ANCHOR = '#arrival-details'
const MAIN_IMPORT_REASON_ANCHOR = '#main-import-reason'
const WHAT_ARE_YOU_IMPORTING_ANCHOR = '#what-are-you-importing'
const TRANSPORT_DETAILS_ANCHOR = '#transport-details'
const ARRIVAL_DETAILS_ROW_LABELS = [
  copy.rows.portOfEntry,
  copy.rows.arrivalDate,
  copy.rows.meansOfTransport,
  copy.rows.transportIdentification,
  copy.rows.transportDocumentReference
]

const main = (page) => page.getByRole('main')

const headerControls = (page) =>
  formControls(main(page).locator('form:not([novalidate])'))

const importReferences = (page) =>
  page.getByRole('region', { name: copy.importReferences.heading })

const summaryValues = (section) => section.getByRole('definition')

const expectImportReferenceNumbers = async (section, reference) => {
  await expect(section.getByText(copy.importReferences.warning)).toBeVisible()
  await expect(section.getByRole('term')).toHaveText([
    copy.importReferences.notificationReference,
    copy.importReferences.customsDocumentCode
  ])
  await expect(summaryValues(section)).toHaveText([reference, 'C640'])
}

const rowKeysOf = (page, cardTitle) =>
  reviewCardFor(page, cardTitle).getByRole('term')

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

    await expectDraftReview(page)
    await expect(
      page.getByRole('heading', {
        name: copy.sections.aboutTheConsignment
      })
    ).toBeVisible()
    await expect(rowFor(page, copy.rows.countryOfOrigin)).toContainText(
      'France'
    )
    await expect(rowKeysOf(page, copy.cards.originOfImport)).toHaveText([
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

test.describe('check-answers feature Permanent address subsection of the Consignment addresses card', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('renders one entry per cat in the Consignment addresses card Permanent address subsection, keyed by its common name and number, and heads its identification details in bold body text with the identifiers alone', async ({
    page
  }) => {
    test.slow()
    await openCommodityDetails(page, [FELIS_CATUS_ROW])
    await (await numberOfAnimalsFor(page, FELIS_CATUS_ROW)).fill('2')
    await saveAndContinue(page).click()
    await identifyAnimalsByMicrochip(page, ['MICROCHIP-1', 'MICROCHIP-2'])

    await openOverview(page)
    await page.getByRole('link', { name: hubCopy.rows.addresses.title }).click()
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
    await expectDraftReview(page)

    const addressesCard = reviewCardFor(page, copy.cards.consignmentAddresses)
    const permanentAddressRow = (animal) =>
      addressesCard.getByRole('term').filter({ hasText: animal }).locator('..')
    await expect(
      addressesCard.getByRole('heading', { name: 'Permanent address' })
    ).toBeVisible()
    const catOneEntry =
      permanentAddressRow('Domestic Cat 1').getByRole('definition')
    await expect(catOneEntry).toHaveText(
      `${partyPickerName(values.placeOfDestination)} 18 Dockside Road London E14 9GE United Kingdom`,
      { useInnerText: true }
    )
    await expect(permanentAddressRow('Domestic Cat 2')).toContainText(
      'Pet Owner'
    )

    const speciesBlock = page.locator(SPECIES_BLOCK_SELECTOR, {
      has: page.getByRole('heading', { name: FELIS_CATUS_HEADING, exact: true })
    })
    const identificationHeading = speciesBlock.getByRole('heading', {
      name: copy.identificationDetails.heading
    })
    await expect(identificationHeading).toBeVisible()
    await expect(identificationHeading).toHaveCSS(
      'font-family',
      /^"GDS Transport"/
    )
    await expect(identificationHeading).toHaveCSS('font-weight', '700')
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
      page.locator(SPECIES_BLOCK_SELECTOR).getByRole('heading', { level: 4 })
    ).toHaveText([BISON_BISON_HEADING, BOS_TAURUS_HEADING])

    for (const [speciesName, heading] of [
      ['bos taurus', BOS_TAURUS_HEADING],
      ['bison bison', BISON_BISON_HEADING]
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

  test('reads one commodity card per code back, each holding only its own species blocks with the counts entered', async ({
    page
  }) => {
    test.slow()
    const cardsInOrder = [
      {
        code: BOS_TAURUS_ROW.commodityCode,
        blocks: [
          { heading: BISON_BISON_HEADING, count: '2' },
          { heading: BOS_TAURUS_HEADING, count: '3' }
        ]
      },
      {
        code: FELIS_CATUS_ROW.commodityCode,
        blocks: [{ heading: FELIS_CATUS_HEADING, count: '4' }]
      }
    ]
    await openReviewWithSpeciesCounts(page, [
      { species: BISON_BISON_ROW, count: '2' },
      { species: BOS_TAURUS_ROW, count: '3' },
      { species: FELIS_CATUS_ROW, count: '4' }
    ])

    await expect(
      page.getByRole('heading', { level: 3, name: /^\d{4,8}$/ })
    ).toHaveText(cardsInOrder.map(({ code }) => code))
    for (const { code, blocks } of cardsInOrder) {
      const speciesBlocks = reviewCardFor(page, code).locator(
        SPECIES_BLOCK_SELECTOR
      )
      await expect(speciesBlocks.getByRole('heading', { level: 4 })).toHaveText(
        blocks.map(({ heading }) => heading)
      )
      for (const { heading, count } of blocks) {
        const block = speciesBlocks.filter({
          has: page.getByRole('heading', {
            level: 4,
            name: heading,
            exact: true
          })
        })
        await expect(
          block
            .getByRole('term')
            .filter({ hasText: copy.rows.numberOfAnimals })
            .locator('..')
            .getByRole('definition')
            .first()
        ).toHaveText(count)
      }
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
      copy.sections.addresses,
      copy.sections.contactAddress
    ])
  })

  test('ends with Continue alone in its last block, and nothing after it', async ({
    page
  }) => {
    await startNotification(page)
    await openNotificationView(page)

    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      journeyIdFromPage(page)
    )
    await expect(page).toHaveTitle(
      `${sharedCopy.layout.errorTitlePrefix}${journeyIdFromPage(page)} - ${sharedCopy.layout.serviceName} - ${sharedCopy.layout.govukSuffix}`
    )
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
    await expect(formControls(lastBlock)).toHaveText([copy.submit.button])
  })

  test('puts every card title straight under its section heading, with no other heading between them', async ({
    page
  }) => {
    await startNotification(page)
    await openNotificationView(page)

    await expect(page.getByRole('main').getByRole('heading')).toHaveText([
      sharedCopy.errorSummary.title,
      journeyIdFromPage(page),
      copy.importReferences.heading,
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
      copy.documentN(1),
      copy.sections.addresses,
      copy.cards.consignmentAddresses,
      copy.sections.contactAddress,
      copy.cards.contactAddress
    ])

    await expect(
      page.getByRole('main').getByRole('heading', { level: 1 })
    ).toHaveText([journeyIdFromPage(page)])
    await expect(
      page.getByRole('main').getByRole('heading', { level: 2 })
    ).toHaveText([
      sharedCopy.errorSummary.title,
      copy.importReferences.heading,
      copy.sections.aboutTheConsignment,
      copy.sections.descriptionOfTheGoods,
      copy.sections.transportAndArrival,
      copy.sections.documents,
      copy.sections.addresses,
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
      copy.documentN(1),
      copy.cards.consignmentAddresses,
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
      page.getByRole('heading', { name: copy.documentN(1), exact: true })
    ).toBeVisible()
    await expect(
      rowFor(page, copy.rows.documentReference).getByRole('definition')
    ).toHaveText(sharedCopy.notApplicable)

    const changeLink = cardChangeLink(page, copy.hidden.document(1))
    await expect(changeLink).toHaveAttribute(
      'href',
      /\/notifications\/[^/]+\/accompanying-documents\?from=(?:[^#]*%2C)?notification-view$/
    )

    await changeLink.click()

    await expect(page).toHaveURL(
      /\/accompanying-documents\?from=(?:[^#]*%2C)?notification-view$/
    )
  })

  test('reads the uploaded file name back as the Attachment of the Document 1 card', async ({
    page
  }) => {
    const filename = 'itahc-review.pdf'
    await openDocuments(page)
    await addDocument(page, {
      accompanyingDocumentReference: 'GBHC0000000001',
      accompanyingDocumentType: 'ITAHC',
      accompanyingDocumentDateOfIssue: { day: '3', month: '1', year: '2026' },
      filename
    })
    await openNotificationView(page)

    await expect(
      rowFor(page, copy.rows.attachment).getByRole('definition')
    ).toHaveText(filename)
  })

  test('marks the Document 1 card as rejected as soon as the review opens, and links the error summary to it', async ({
    page
  }) => {
    test.slow()
    const infected = documentNamed('VIRUS-0001', INFECTED_DOCUMENT_FILE_NAME)
    await openDocuments(page)
    await addDocument(page, infected)
    await expect(
      documentRowFor(page, infected.accompanyingDocumentReference)
    ).toContainText(documentsCopy.scanTags.virusFound)
    await openNotificationView(page)

    const card = reviewCardFor(page, copy.documentN(1))
    await expect(
      card.getByText(documentsCopy.errors.someRejected)
    ).toBeVisible()
    await expect(
      errorSummaryLinks(page, documentsCopy.errors.someRejected, {
        exact: true
      })
    ).toHaveAttribute('href', `#${await card.getAttribute('id')}`)
  })

  test('leaves the Document 1 card unmarked for a document still being scanned until Continue is refused', async ({
    page
  }) => {
    test.slow()
    await openDocuments(page)
    await addDocument(
      page,
      documentNamed('SCAN-0001', STILL_SCANNING_DOCUMENT_FILE_NAME)
    )
    await openNotificationView(page)

    const card = reviewCardFor(page, copy.documentN(1))
    await expect(
      card.getByText(documentsCopy.errors.someStillScanning)
    ).toHaveCount(0)

    await page.getByRole('button', { name: copy.submit.button }).click()

    await expect(
      card.getByText(documentsCopy.errors.someStillScanning)
    ).toBeVisible()
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

  test('shows the port of exit then the destination country a transit collected, with the one Change link in the card heading', async ({
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

    await expect(rowKeysOf(page, copy.cards.mainImportReason)).toHaveText([
      copy.rows.reasonForImport,
      copy.rows.portOfExit,
      copy.rows.destinationCountry
    ])
    await expect(rowFor(page, copy.rows.portOfExit)).toContainText(
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
        copy.hidden.document(1),
        copy.hidden.cards.consignmentAddresses,
        copy.hidden.cards.contactAddress
      ].map((hiddenText) => {
        const name = RegExp.escape(`${copy.change} ${hiddenText}`)
        return new RegExp(`^${name}( \\(.+\\))?$`)
      })
    )
  })

  test('opens the consignment addresses page from the Consignment addresses card', async ({
    page
  }) => {
    await startNotification(page)
    await openNotificationView(page)

    const changeLink = cardChangeLink(
      page,
      copy.hidden.cards.consignmentAddresses
    )
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

  test('back link returns to the notification list', async ({ page }) => {
    await startNotification(page)
    await openNotificationView(page)

    await page.getByRole('link', { name: 'Back', exact: true }).click()

    await expect(page).toHaveURL(urlUnderBase(''))
  })

  test('review has no serious or critical axe violations', async ({ page }) => {
    await startNotification(page)
    await openNotificationView(page)

    await expectNoSeriousOrCriticalViolations(page, 'Check answers')
  })

  test('Delete on a draft review opens the delete confirmation', async ({
    page
  }) => {
    await startNotification(page)
    await openNotificationView(page)

    await deleteFromReview(page, deleteCopy.title)
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

    await expect(rowKeysOf(page, copy.cards.transportDetails)).toHaveText([
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
        reviewCardFor(page, copy.cards.arrivalDetails).getByText(
          copy.errors.cards.arrivalDetails
        )
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
      reviewCardFor(page, copy.cards.arrivalDetails).getByText(
        copy.errors.cards.arrivalDetails
      )
    ).toContainText(copy.errors.prefix)
  })

  test('names the unfinished main import reason and additional details cards in the error summary and on each card', async ({
    page
  }) => {
    await startNotification(page)
    await openNotificationView(page)

    await expectMainImportReasonAndAdditionalDetailsNamed(page)
  })

  test('accepts the main import reason and additional details left blank by Save and return to overview, then names both cards when Continue is refused', async ({
    page
  }) => {
    test.slow()
    await startNotification(page)
    await unlockSections(page, BOS_TAURUS_ROW)

    await openFromOverviewRow(page, hubCopy.rows.importReason.title)
    await saveAndReturnToHub(page).click()
    await expectOverview(page)

    await openFromOverviewRow(page, hubCopy.rows.additionalDetails.title)
    await saveAndReturnToHub(page).click()
    await expectOverview(page)

    const reviewUrl = notificationViewUrl(page)
    await openReviewFromHub(page)
    await page.getByRole('button', { name: copy.submit.button }).click()

    await expect(page).toHaveURL(`${reviewUrl}?refused=1`)
    await expectMainImportReasonAndAdditionalDetailsNamed(page)
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
      WHAT_ARE_YOU_IMPORTING_ANCHOR
    )
    await expect(page.locator(WHAT_ARE_YOU_IMPORTING_ANCHOR)).toContainText(
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

test.describe('check-answers feature draft notification reached from Review and submit', () => {
  let createdBefore
  let createdAfter

  test.beforeEach(async ({ page }) => {
    await signIn(page)
    createdBefore = Date.now()
    await startNotification(page)
    createdAfter = Date.now()
    await openReviewFromHub(page)
  })

  test('is headed by its reference with a Draft tag beside it and a title naming the reference', async ({
    page
  }) => {
    await expectDraftReview(page)
    await expect(page).toHaveTitle(
      `${sharedCopy.layout.errorTitlePrefix}${journeyIdFromPage(page)} - ${sharedCopy.layout.serviceName} - ${sharedCopy.layout.govukSuffix}`
    )
  })

  test('dates the notification by its creation under its header', async ({
    page
  }) => {
    const createdLines = new Set(
      [createdBefore, createdAfter].map((instant) =>
        copy.viewHeader.dateCreated(formatMomentAsLongDay(new Date(instant)))
      )
    )
    const alternatives = [...createdLines].map(RegExp.escape).join('|')

    await expect(page.getByText(/^Date created: /)).toHaveText(
      new RegExp(`^(${alternatives})$`)
    )
  })

  test('offers Copy as new then Delete in its header, and no Amend this notification', async ({
    page
  }) => {
    await expect(headerControls(page)).toHaveText([
      sharedCopy.notificationActions.copy.text,
      sharedCopy.notificationActions.delete.text
    ])
  })

  test('Copy as new opens a different draft notification overview', async ({
    page
  }) => {
    const reference = journeyIdFromPage(page)

    await headerControls(page)
      .getByText(sharedCopy.notificationActions.copy.text, { exact: true })
      .click()

    await expectOverview(page)
    expect(journeyIdFromPage(page)).not.toBe(reference)
  })

  test('Delete in the header opens the delete confirmation', async ({
    page
  }) => {
    await deleteFromReview(page, deleteCopy.title)
  })

  test('shows the import reference numbers as text with the warning, the reference and the customs document code', async ({
    page
  }) => {
    const section = importReferences(page)

    await expectImportReferenceNumbers(section, journeyIdFromPage(page))
    await expect(section.getByRole('button')).toHaveCount(0)
  })

  test('keeps a Change link on every card', async ({ page }) => {
    const cardHeadings = await page
      .getByRole('heading', { level: 3 })
      .allTextContents()

    expect(cardHeadings).not.toHaveLength(0)
    for (const heading of cardHeadings) {
      await expect(
        reviewCardFor(page, heading).getByRole('link', {
          name: new RegExp(`^${copy.change}`)
        })
      ).not.toHaveCount(0)
    }
  })

  test('lists every unfinished card in the error summary, each linking to its card with its message on the card', async ({
    page
  }) => {
    const unfinishedCards = [
      ['whatAreYouImporting', WHAT_ARE_YOU_IMPORTING_ANCHOR],
      ['mainImportReason', MAIN_IMPORT_REASON_ANCHOR],
      ['commodityDetails', '#description-of-the-goods'],
      ['additionalDetails', '#additional-details'],
      ['arrivalDetails', ARRIVAL_DETAILS_ANCHOR],
      ['transportDetails', TRANSPORT_DETAILS_ANCHOR],
      ['consignmentAddresses', '#addresses'],
      ['contactAddress', '#contact-address']
    ]
    const cardsShowingTheirMessage = unfinishedCards.filter(
      ([card]) => card !== 'commodityDetails'
    )
    const summaryEntries = errorSummaryLinks(page)

    await expect(
      page.getByRole('heading', { name: sharedCopy.errorSummary.title })
    ).toBeVisible()
    await expect(summaryEntries).toHaveText(
      unfinishedCards.map(([card]) => copy.errors.cards[card])
    )
    for (const [card, anchor] of unfinishedCards) {
      await expect(
        errorSummaryLinks(page, copy.errors.cards[card], { exact: true })
      ).toHaveAttribute('href', anchor)
    }
    for (const [card] of cardsShowingTheirMessage) {
      await expect(
        reviewCardFor(page, copy.cards[card]).getByText(copy.errors.cards[card])
      ).toBeVisible()
    }
  })

  test('ends with Continue', async ({ page }) => {
    await expectDraftReviewEndsWithContinue(page)
  })

  test('sends Back to the notification list when opened without a trail', async ({
    page
  }) => {
    await openNotificationView(page)

    await expect(backLink(page)).toHaveAttribute('href', BASE)
  })

  test('draft headed by its reference has no serious or critical axe violations', async ({
    page
  }) => {
    await expectNoSeriousOrCriticalViolations(page, 'Draft review')
  })
})

const openSubmittedViewFromList = async (page, reference) => {
  await page.goto(BASE)
  await page
    .getByRole('link', {
      name: `View ${dashboardCopy.actionHidden(reference)}`
    })
    .click()
  await expect(
    page.getByRole('heading', { level: 1, name: reference, exact: true })
  ).toBeVisible()
}

test.describe('check-answers feature submitted notification', () => {
  test.describe.configure({ timeout: 90000 })

  let reference
  let submittedBefore
  let submittedAfter

  test.beforeEach(async ({ page }) => {
    await signIn(page)
    submittedBefore = Date.now()
    reference = await submitCompleteNotification(page)
    submittedAfter = Date.now()
    await openSubmittedViewFromList(page, reference)
  })

  test('is headed by its reference with a Submitted tag beside it and a title naming the reference', async ({
    page
  }) => {
    await expect(
      page.getByRole('heading', { level: 1, name: reference, exact: true })
    ).toBeVisible()
    await expect(
      viewHeaderTag(page, sharedCopy.journeyStrip.submitted)
    ).toBeVisible()
    await expect(page).toHaveTitle(
      `${reference} - ${sharedCopy.layout.serviceName} - ${sharedCopy.layout.govukSuffix}`
    )
  })

  test('dates the notification under its header', async ({ page }) => {
    const submittedLines = new Set(
      [submittedBefore, submittedAfter].map((instant) =>
        copy.viewHeader.dateSubmitted(formatMomentAsLongDay(new Date(instant)))
      )
    )
    const alternatives = [...submittedLines].map(RegExp.escape).join('|')

    await expect(page.getByText(/^Date submitted: /)).toHaveText(
      new RegExp(`^(${alternatives})$`)
    )
  })

  test('offers Amend this notification, Copy as new and Delete in its header', async ({
    page
  }) => {
    await expect(headerControls(page)).toHaveText([
      copy.viewHeader.amend,
      sharedCopy.notificationActions.copy.text,
      sharedCopy.notificationActions.delete.text
    ])
    await expect(
      page.getByRole('button', { name: copy.submit.button })
    ).toHaveCount(0)
  })

  test('Amend this notification opens the amendment review', async ({
    page
  }) => {
    await page.getByRole('button', { name: copy.viewHeader.amend }).click()

    await expect(journeyStripTag(page)).toBeVisible()
  })

  test('submitted review has no serious or critical axe violations', async ({
    page
  }) => {
    await expectNoSeriousOrCriticalViolations(page, 'Submitted check answers')
  })

  test('Delete on the submitted view opens the delete confirmation', async ({
    page
  }) => {
    await deleteFromReview(page, deleteCopy.title)
  })

  test('shows the import reference numbers with the warning, the reference and the customs document code', async ({
    page
  }) => {
    await expectImportReferenceNumbers(importReferences(page), reference)
  })

  test('shows the import reference numbers as text with no button when JavaScript is off', async ({
    page,
    browser
  }) => {
    await withoutJavaScript(page, browser, async (noJs) => {
      const section = importReferences(noJs)

      await expect(
        section.getByText(copy.importReferences.warning)
      ).toBeVisible()
      await expect(summaryValues(section)).toHaveText([reference, 'C640'])
      await expect(section.getByRole('button')).toHaveCount(0)
    })
  })

  test('is headed by the import references warning alone', async ({ page }) => {
    await expect(
      main(page).getByText(copy.importReferences.warning)
    ).toHaveCount(1)
  })

  test('shows the same submitted date after a reload', async ({ page }) => {
    const dateLine = page.getByText(/^Date submitted: /)
    const dateText = await dateLine.textContent()

    await page.reload()

    await expect(dateLine).toHaveText(dateText)
  })

  test('shows a single Document 1 card when no document is uploaded', async ({
    page
  }) => {
    const documentsHeading = page.getByRole('heading', {
      level: 2,
      name: copy.sections.documents
    })

    await expect(documentsHeading).toBeVisible()
    await expect(
      page.getByRole('heading', { level: 3, name: copy.documentN(1) })
    ).toBeVisible()
    await expect(
      rowFor(page, copy.rows.documentReference).getByRole('definition')
    ).toHaveText(sharedCopy.notApplicable)
  })

  test('offers no Change links', async ({ page }) => {
    await expect(page.getByRole('link', { name: copy.change })).toHaveCount(0)
  })
})

test.describe('check-answers feature notification that does not exist', () => {
  test('opening its view goes to the notification list', async ({ page }) => {
    await signIn(page)

    await page.goto(
      `${BASE}/notifications/GBN-0000-0000-0000/notification-view`
    )

    await expect(
      page.getByRole('heading', {
        level: 1,
        name: dashboardCopy.title,
        exact: true
      })
    ).toBeVisible()
  })
})

test.describe('check-answers feature amendment review', () => {
  test.describe.configure({ timeout: 90000 })

  let reference

  test.beforeEach(async ({ page }) => {
    await signIn(page)
    reference = await submitCompleteNotification(page)
    await amendFromList(page, reference)
    await openNotificationView(page)
  })

  test.describe('with the arrival date cleared', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`${BASE}/notifications/${reference}/port-of-entry`)
      await page.getByLabel('Arrival date at port of entry').fill('')
      await saveAndReturnToHub(page).click()
      await openReviewFromHub(page)
    })

    test('an amendment with a missing answer opens with no error summary and no card errors', async ({
      page
    }) => {
      await expect(
        page.getByRole('heading', { level: 1, name: copy.resubmittingTitle })
      ).toBeVisible()
      await expect(
        page.getByRole('heading', { name: sharedCopy.errorSummary.title })
      ).toHaveCount(0)
      await expect(main(page).getByText(copy.errors.prefix)).toHaveCount(0)
    })

    test('Continue on an amendment with a missing answer shows the error summary naming the arrival date', async ({
      page
    }) => {
      await page.getByRole('button', { name: copy.submit.button }).click()

      await expect(
        page.getByRole('heading', { name: sharedCopy.errorSummary.title })
      ).toBeVisible()
      await expect(
        page.getByRole('link', { name: copy.errors.cards.arrivalDetails })
      ).toBeVisible()
    })
  })

  test('ends with Continue, Cancel amend and Delete', async ({ page }) => {
    await expect(reviewFootControls(page)).toHaveText([
      copy.submit.button,
      sharedCopy.journeyStrip.cancelAmend,
      sharedCopy.notificationActions.delete.text
    ])
    await expect(
      page
        .getByRole('main')
        .getByRole('button', { name: sharedCopy.journeyStrip.cancelAmend })
    ).toHaveAttribute('href', /\/cancel-amend$/)
  })

  test('Cancel amend on the review opens the cancel-amendment confirmation', async ({
    page
  }) => {
    await page
      .getByRole('main')
      .getByRole('button', { name: sharedCopy.journeyStrip.cancelAmend })
      .click()

    await expect(
      page.getByRole('heading', { level: 1, name: cancelAmendCopy.title })
    ).toBeVisible()
  })

  test('Delete on the review opens the delete confirmation', async ({
    page
  }) => {
    await deleteFromReview(page, deleteCopy.title)
  })

  test('is headed and titled for re-submitting once an answer changes', async ({
    page
  }) => {
    await changeOriginOnAmendment(page, 'ChangedRef1')

    await expect(
      page.getByRole('heading', { level: 1, name: copy.resubmittingTitle })
    ).toBeVisible()
    await expect(page).toHaveTitle(new RegExp(`^${copy.resubmittingTitle}`))
  })

  test('has no serious or critical axe violations', async ({ page }) => {
    await expectNoSeriousOrCriticalViolations(page, 'Amendment check answers')
  })
})
