import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import {
  answerArrivalDetails,
  answerCountryOfOrigin,
  answerTransitCountries,
  BASE,
  chooseAutocompleteByLabel,
  chooseCountryOfOrigin,
  completeAnswerSections,
  journeyIdFromPage,
  journeyUrl,
  openReviewFromHub,
  referenceHeading,
  selectSpecies,
  signIn,
  startNotification,
  unlockSections,
  uploadHealthCertificate,
  urlUnderBase
} from '../../../../../../../../../fit/live-animals-journey.js'
import { copy as importReasonCopy } from '../import-reason/copy/copy.en.js'
import { copy as dashboardCopy } from '../dashboard/copy/copy.en.js'
import { copy as sharedCopy } from '../../../../../../shared/copy.en.js'
import { copy as deleteCopy } from '../delete-notification/copy/copy.en.js'
import { copy } from './copy/copy.en.js'

const INTERNAL_REFERENCE_LABEL =
  'Your internal reference for this consignment (optional)'
const SAVE_AND_CONTINUE = 'Save and continue'
const NOTIFICATION_VIEW_SLUG = 'notification-view'
const NO_DOCUMENTS_SENTENCE = 'You have not added any documents yet.'
const ARRIVAL_DETAILS_ANCHOR = '#arrival-details'
const WHAT_ARE_YOU_IMPORTING_ANCHOR = '#what-are-you-importing'
const COMMODITY_DETAILS_ANCHOR = '#commodity-details'
const FELIS_CATUS = 'Felis Catus'
const WHAT_ARE_YOU_IMPORTING = 'What are you importing?'
const BOS_TAURUS_SPECIES = 'Bos taurus'
const FELIS_CATUS_SPECIES = 'Felis catus'
const BOS_TAURUS_LOWER = 'bos taurus'
const FELIS_CATUS_LOWER = 'felis catus'
const SPECIES_1_HREF = '#species-1'
const SPECIES_2_HREF = '#species-2'
const BOS_TAURUS_HEADING = 'Bos Taurus'
const IDENTIFICATION_SLUG = 'commodities/identification'
const BUTTON_GROUP = '.govuk-button-group'

const rowFor = (page, label) =>
  page
    .getByRole('term')
    .filter({ has: page.getByText(label, { exact: true }) })
    .locator('..')

/** The mark an empty row carries inside a card that still has answers
 * outstanding: no text, and a visually hidden "Missing" in place of one. */
const missingMarker = (page, label) =>
  rowFor(page, label).locator('.app-summary-list__value--missing')

/** The one Change link a card carries in its heading, named the way a screen
 * reader reads it — "Change origin of import". */
const cardChangeLink = (page, hiddenText) =>
  page.getByRole('link', { name: `${copy.change} ${hiddenText}` })

const expectNoSeriousOrCriticalAxeViolations = async (page, pageName) => {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze()
  const seriousOrCritical = results.violations.filter(({ impact }) =>
    ['serious', 'critical'].includes(impact)
  )

  expect(
    seriousOrCritical,
    `${pageName} has serious/critical accessibility violations.\nFull axe violations:\n${JSON.stringify(results.violations, null, 2)}`
  ).toEqual([])
}

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
    // Five characters after the prefix — the joined code is eight, which the old whole-code cap made impossible.
    await page
      .getByLabel('Enter the region of origin code', { exact: true })
      .fill('IDF75')
    await page.getByLabel(INTERNAL_REFERENCE_LABEL).fill('ReviewRef1')
    await page.getByRole('button', { name: SAVE_AND_CONTINUE }).click()

    await page.goto(journeyUrl(page, NOTIFICATION_VIEW_SLUG))

    await expect(referenceHeading(page)).toBeVisible()
    await expect(
      page.getByRole('heading', {
        name: copy.sections.aboutTheConsignment
      })
    ).toBeVisible()
    await expect(rowFor(page, copy.rows.countryOfOrigin)).toContainText(
      'France'
    )
    await expect(
      page.getByText('Region of origin code required', { exact: true })
    ).toHaveCount(0)
    await expect(rowFor(page, copy.rows.regionCode)).toContainText('FR-IDF75')
    await expect(rowFor(page, copy.rows.internalReference)).toContainText(
      'ReviewRef1'
    )
    await expect(missingMarker(page, copy.rows.arrivalDate)).toHaveText(
      copy.missing
    )
  })

  // Design release 1 gives an empty value two different treatments, and the
  // difference is the card around it, not whether that particular answer was
  // required. The entry page finishes import details, so the optional internal
  // reference it left blank is settled business and written out; arrival
  // details is still outstanding, so its blank row is given no text at all and
  // marked instead. A trader can then see which rows are still owed without
  // reading a word.
  test('journey with only the entry page answered writes the settled blanks out and marks the outstanding ones', async ({
    page
  }) => {
    await startNotification(page)
    await page.goto(journeyUrl(page, NOTIFICATION_VIEW_SLUG))

    await expect(rowFor(page, copy.rows.internalReference)).toContainText(
      copy.notApplicable
    )
    await expect(missingMarker(page, copy.rows.arrivalDate)).toHaveText(
      copy.missing
    )
    await expect(rowFor(page, copy.rows.arrivalDate)).not.toContainText(
      copy.notApplicable
    )
  })
})

// Design release 2.1 lays the review out as six numbered sections mirroring the
// task list, with every card straight under its numbered section heading and no
// subsection heading between them. A brand-new notification shows the sections
// that always stand: the commodity cards wait on a line and the
// transit-countries subsection on an overland arrival.
test.describe('check-answers feature section structure', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('numbers the six sections in order', async ({ page }) => {
    await startNotification(page)
    await page.goto(journeyUrl(page, NOTIFICATION_VIEW_SLUG))

    // Numbered, so the section headings are the level-2 headings that open
    // with a number — the error summary and the footer's own level-2 headings
    // are not part of the spine.
    await expect(
      page.getByRole('heading', { level: 2 }).filter({ hasText: /^\d\.\s/ })
    ).toHaveText([
      copy.sections.aboutTheConsignment,
      copy.sections.descriptionOfTheGoods,
      copy.sections.transportAndArrival,
      copy.sections.documents,
      copy.sections.consignmentParties,
      copy.sections.contactAddress
    ])
  })

  // Design release 1 ends the review with the button. Nothing stands between
  // the last card and Continue — no heading and no sentence — so the button's
  // own label carries the whole instruction.
  test('ends with the Continue button and nothing above it', async ({
    page
  }) => {
    await startNotification(page)
    await page.goto(journeyUrl(page, NOTIFICATION_VIEW_SLUG))

    await expect(
      page.getByRole('main').getByRole('heading', { level: 2 }).last()
    ).toHaveText(copy.sections.contactAddress)

    const lastBlock = page.locator('.govuk-grid-column-two-thirds > *').last()
    await expect(lastBlock).toHaveJSProperty('tagName', 'FORM')

    // Nothing sits between the last card and the form: a reinstated heading
    // or explanatory sentence would land here and fail.
    await expect(
      lastBlock.locator('xpath=preceding-sibling::*[1]')
    ).toHaveClass(/govuk-summary-card/)

    await expect(
      lastBlock.getByRole('button', { name: copy.submit.button })
    ).toBeVisible()
  })

  test('stands every card straight under its numbered section, titled one level below it', async ({
    page
  }) => {
    await startNotification(page)
    await page.goto(journeyUrl(page, NOTIFICATION_VIEW_SLUG))

    // No subsection heading stands between a section and its cards, so the
    // level-3 headings are exactly the card titles.
    await expect(page.getByRole('heading', { level: 3 })).toHaveText([
      copy.cards.importDetails,
      copy.cards.whatAreYouImporting,
      copy.cards.reasonForImport,
      copy.cards.additionalAnimalDetails,
      copy.cards.arrivalDetails,
      copy.cards.transportDetails,
      copy.documentN(1),
      copy.cards.rolesAndAddresses,
      copy.cards.contactAddress
    ])
    await expect(page.getByRole('heading', { level: 3 })).toHaveCount(
      await page.locator('.govuk-summary-card').count()
    )
    await expect(page.getByRole('heading', { level: 4 })).toHaveCount(0)

    for (const name of [
      'Where is this consignment coming from?',
      'Commodity details',
      'Upload documents',
      'Roles and addresses',
      'Contact address for this consignment'
    ]) {
      await expect(
        page.getByRole('heading', { name, exact: true })
      ).toHaveCount(0)
    }
  })
})

test.describe('check-answers feature documents section', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  // Documents are optional, so a journey with none is the ordinary case. The
  // section has to stand anyway, or the review never mentions documents and
  // offers no route to the upload page.
  test('shows a single Document 1 card reading Not applicable, and a Change route, with nothing uploaded', async ({
    page
  }) => {
    await startNotification(page)
    await page.goto(journeyUrl(page, NOTIFICATION_VIEW_SLUG))

    await expect(
      page.getByRole('heading', { name: copy.sections.documents })
    ).toBeVisible()
    await expect(
      page.getByRole('heading', {
        level: 3,
        name: copy.documentN(1),
        exact: true
      })
    ).toBeVisible()
    await expect(rowFor(page, copy.rows.documentReference)).toContainText(
      copy.notApplicable
    )
    await expect(page.getByText(NO_DOCUMENTS_SENTENCE)).toHaveCount(0)

    const changeLink = cardChangeLink(page, copy.hidden.documentN(1))
    await expect(changeLink).toHaveAttribute(
      'href',
      /\/notifications\/[^/]+\/accompanying-documents\?change=1$/
    )

    await changeLink.click()

    await expect(page).toHaveURL(/\/accompanying-documents\?change=1$/)
  })
})

// The reason for import asks up to three further questions as conditional
// reveals. Each answer has to read back on the review with a Change route to
// the page that collected it.
test.describe('check-answers feature exit answers', () => {
  const IMPORT_REASON_SLUG = 'import-reason'
  const EXIT_PORT_CODE = 'GB DVR'
  const EXIT_PORT_LABEL = 'Port of Dover - GB DVR'
  const DESTINATION_COUNTRY_NAME = 'Ireland'

  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('shows the exit border control post and then the destination country a transit collected, with the one Change link in the card heading', async ({
    page
  }) => {
    await startNotification(page)
    await page.goto(journeyUrl(page, IMPORT_REASON_SLUG))
    await page.locator('input[name="reasonForImport"][value="transit"]').check()
    await chooseAutocompleteByLabel(page, {
      label: importReasonCopy.port.label,
      inputId: 'transitPortOfExit',
      query: EXIT_PORT_CODE,
      optionName: EXIT_PORT_LABEL
    })
    await chooseAutocompleteByLabel(page, {
      label: importReasonCopy.country.label,
      inputId: 'transitDestinationCountry',
      query: DESTINATION_COUNTRY_NAME,
      optionName: DESTINATION_COUNTRY_NAME
    })
    await page.getByRole('button', { name: SAVE_AND_CONTINUE }).click()

    await page.goto(journeyUrl(page, NOTIFICATION_VIEW_SLUG))

    await expect(
      page.locator('#reason-for-import').getByRole('term')
    ).toHaveText([
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
      page.getByText(copy.rows.portOfExit, { exact: true })
    ).toHaveCount(0)
    await expect(
      page.getByText(copy.rows.exitDate, { exact: true })
    ).toHaveCount(0)

    // The exit answers sit in the Main import reason card, and that card — not
    // the row — carries the one Change link. Every row on the card comes from
    // the reason-for-import page, so the link reaches all of them.
    await expect(
      rowFor(page, copy.rows.destinationCountry).getByRole('link')
    ).toHaveCount(0)

    const changeLink = cardChangeLink(page, copy.hidden.cards.reasonForImport)
    await expect(changeLink).toHaveAttribute(
      'href',
      /\/notifications\/[^/]+\/import-reason\?change=1$/
    )

    await changeLink.click()

    await expect(page).toHaveURL(/\/import-reason\?change=1$/)
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
    await chooseAutocompleteByLabel(page, {
      label: importReasonCopy.port.label,
      inputId: 'temporaryAdmissionPortOfExit',
      query: EXIT_PORT_CODE,
      optionName: EXIT_PORT_LABEL
    })
    await page.getByRole('button', { name: SAVE_AND_CONTINUE }).click()

    await page.goto(journeyUrl(page, NOTIFICATION_VIEW_SLUG))

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

    await page.goto(journeyUrl(page, NOTIFICATION_VIEW_SLUG))

    for (const label of [
      copy.rows.destinationCountry,
      copy.rows.exitDate,
      copy.rows.portOfExit,
      copy.rows.exitBorderControlPost
    ]) {
      await expect(page.getByText(label, { exact: true })).toHaveCount(0)
    }
  })
})

// Design release 2.1 reads the countries a consignment travels through inside
// the Arrival details card, under their own heading, and does not owe them for
// submission.
test.describe('check-answers feature transit countries', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('reads the transit countries inside Arrival details under their own heading, with a Change link of their own', async ({
    page
  }) => {
    await startNotification(page)
    await unlockSections(page)
    await page.goto(journeyUrl(page, 'port-of-entry'))
    await answerArrivalDetails(page)
    await page.goto(journeyUrl(page, 'transit-countries'))
    await answerTransitCountries(page)
    await page.goto(journeyUrl(page, NOTIFICATION_VIEW_SLUG))

    const card = page.locator(ARRIVAL_DETAILS_ANCHOR)
    await expect(
      card.getByRole('heading', {
        level: 4,
        name: copy.subsections.transitCountries,
        exact: true
      })
    ).toBeVisible()
    await expect(rowFor(page, copy.rows.transitedCountries)).toContainText(
      'France, Belgium'
    )
    await expect(
      page.getByRole('heading', {
        level: 3,
        name: copy.subsections.transitCountries,
        exact: true
      })
    ).toHaveCount(0)

    const changeLink = page.getByRole('link', {
      name: `${copy.change} ${copy.hidden.rows.transitedCountries}`
    })
    await expect(changeLink).toHaveAttribute(
      'href',
      /\/notifications\/[^/]+\/transit-countries\?change=1$/
    )

    await changeLink.click()

    await expect(page).toHaveURL(/\/transit-countries\?change=1$/)
  })

  test.describe('with every other answer given', () => {
    test.describe.configure({ timeout: 90000 })

    test('goes on to the declaration from an overland notification that lists no transit countries', async ({
      page
    }) => {
      await startNotification(page)
      await completeAnswerSections(page, { skipTransitCountries: true })
      await openReviewFromHub(page)

      await expect(
        page.getByRole('link', { name: 'Complete transit countries' })
      ).toHaveCount(0)
      await expect(
        page.getByRole('heading', { name: sharedCopy.errorSummary.title })
      ).toHaveCount(0)
      await expect(rowFor(page, copy.rows.transitedCountries)).toContainText(
        copy.notApplicable
      )

      await page.getByRole('button', { name: copy.submit.button }).click()

      await expect(page).toHaveURL(/\/declaration$/)
    })
  })
})

test.describe('check-answers feature change links', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('Change link threads context and returns to the same review after saving', async ({
    page
  }) => {
    await startNotification(page)
    await openOrigin(page)
    await chooseCountryOfOrigin(page, 'France')
    await page.getByLabel(INTERNAL_REFERENCE_LABEL).fill('ReviewRef1')
    await page.getByRole('button', { name: SAVE_AND_CONTINUE }).click()
    await page.goto(journeyUrl(page, NOTIFICATION_VIEW_SLUG))

    const changeLink = cardChangeLink(page, copy.hidden.cards.importDetails)
    await expect(changeLink).toHaveAttribute(
      'href',
      /\/notifications\/[^/]+\/origin\?change=1$/
    )

    await changeLink.click()

    await expect(page).toHaveURL(/\/origin\?change=1$/)
    await page.getByLabel(INTERNAL_REFERENCE_LABEL).clear()
    await page.getByRole('button', { name: SAVE_AND_CONTINUE }).click()

    await expect(page).toHaveURL(
      urlUnderBase('/notifications/[^/]+/notification-view')
    )
    await expect(rowFor(page, copy.rows.internalReference)).toContainText(
      copy.notApplicable
    )
  })

  test('the Addresses and Contact address cards each carry one Change link, to the addresses and contact address pages', async ({
    page
  }) => {
    await startNotification(page)
    await page.goto(journeyUrl(page, NOTIFICATION_VIEW_SLUG))

    await expect(
      cardChangeLink(page, copy.hidden.cards.rolesAndAddresses)
    ).toHaveAttribute('href', /\/notifications\/[^/]+\/addresses\?change=1$/)
    await expect(
      cardChangeLink(page, copy.hidden.cards.contactAddress)
    ).toHaveAttribute(
      'href',
      /\/notifications\/[^/]+\/consignment\/contact\/select\?change=1$/
    )
  })

  // Design release 1 puts one Change link in each card's heading bar and none
  // on a row, so the trader meets one link per card rather than one per answer.
  // The transit countries row is the one row-level link, and it only stands on
  // an overland arrival (covered by the transit countries block above). With no
  // commodity chosen there is no species block, whose first row carries the
  // other row-level link (covered by the commodity read-back block below).
  // The Identification details link stands only with saved identifiers and is
  // covered by the same block.
  test('every Change link sits in a card heading and no summary row carries one', async ({
    page
  }) => {
    await startNotification(page)
    await page.goto(journeyUrl(page, NOTIFICATION_VIEW_SLUG))

    const cards = page.locator('.govuk-summary-card')
    const cardCount = await cards.count()

    expect(cardCount).toBeGreaterThan(0)
    await expect(page.getByRole('link', { name: copy.change })).toHaveCount(
      cardCount
    )
    await expect(page.locator('.govuk-summary-list__actions')).toHaveCount(0)

    for (let index = 0; index < cardCount; index += 1) {
      await expect(
        cards.nth(index).locator('.govuk-summary-card__actions a')
      ).toHaveCount(1)
    }
  })
})

test.describe('check-answers feature navigation and submission', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test("a draft's review is titled by its reference, and Back goes to the notification list", async ({
    page
  }) => {
    await startNotification(page)
    const reference = journeyIdFromPage(page)
    await page.goto(journeyUrl(page, NOTIFICATION_VIEW_SLUG))
    await expect(page).toHaveTitle(new RegExp(`^(Error: )?${reference} - `))

    await page.getByRole('link', { name: 'Back', exact: true }).click()

    await expect(page).toHaveURL(urlUnderBase('/?'))
    await expect(
      page.getByRole('heading', { level: 1, name: dashboardCopy.title })
    ).toBeVisible()
  })

  test("a draft's review opened from Review and submit is headed by its reference with a blue Draft tag, the date created and no status bar", async ({
    page
  }) => {
    await startNotification(page)
    await openReviewFromHub(page)
    const reference = journeyIdFromPage(page)

    await expect(
      page.getByRole('heading', { level: 1, name: reference, exact: true })
    ).toBeVisible()
    await expect(
      page
        .getByRole('main')
        .getByText(sharedCopy.journeyStrip.draft, { exact: true })
    ).toHaveClass(/govuk-tag--blue/)
    await expect(page.locator('.app-journey-strip')).toHaveCount(0)
    await expect(page.getByRole('heading', { name: copy.title })).toHaveCount(0)
    await expect(
      page.getByText(
        new RegExp(
          `^${copy.viewHeader.dateCreated('\\d{1,2} [A-Z][a-z]+ \\d{4}')}$`
        )
      )
    ).toBeVisible()
  })

  test("a draft's review shows the import reference numbers as plain text, with no Copy button, without JavaScript", async ({
    page,
    browser
  }) => {
    await startNotification(page)
    const reference = journeyIdFromPage(page)
    const context = await browser.newContext({
      javaScriptEnabled: false,
      storageState: await page.context().storageState()
    })
    const noJs = await context.newPage()

    await noJs.goto(journeyUrl(page, NOTIFICATION_VIEW_SLUG))

    const region = noJs.getByRole('region', {
      name: copy.importReferences.heading
    })
    await expect(region).toContainText(copy.importReferences.warning)
    await expect(
      rowFor(noJs, copy.importReferences.notificationReference).getByRole(
        'definition'
      )
    ).toHaveText(reference)
    await expect(
      rowFor(noJs, copy.importReferences.customsDocumentCode).getByRole(
        'definition'
      )
    ).toHaveText('C640')
    await expect(region.getByRole('button')).toHaveCount(0)

    await context.close()
  })

  test("Copy as new on a draft's review opens a new draft at Overview", async ({
    page
  }) => {
    await startNotification(page)
    const reference = journeyIdFromPage(page)
    await page.goto(journeyUrl(page, NOTIFICATION_VIEW_SLUG))

    await page
      .getByRole('button', {
        name: sharedCopy.notificationActions.copy.text,
        exact: true
      })
      .click()

    await expect(page).toHaveURL(/\/notifications\/[^/]+$/)
    expect(journeyIdFromPage(page)).not.toBe(reference)
  })

  test('opening the view of a notification that does not exist goes to the notification list', async ({
    page
  }) => {
    await startNotification(page)

    await page.goto(
      `${BASE}/notifications/GBN-AG-00-000000/${NOTIFICATION_VIEW_SLUG}`
    )

    await expect(page).toHaveURL(urlUnderBase('/?'))
    await expect(
      page.getByRole('heading', { level: 1, name: dashboardCopy.title })
    ).toBeVisible()
  })

  test('review has no serious or critical axe violations', async ({ page }) => {
    await startNotification(page)
    await page.goto(journeyUrl(page, NOTIFICATION_VIEW_SLUG))

    await expectNoSeriousOrCriticalAxeViolations(page, 'Check answers')
  })

  test("a draft's review offers Copy as new and a red Delete in its header, no Amend this notification, and ends with Continue", async ({
    page
  }) => {
    await startNotification(page)
    await page.goto(journeyUrl(page, NOTIFICATION_VIEW_SLUG))

    const group = page.locator(BUTTON_GROUP).filter({
      has: page.getByRole('button', {
        name: sharedCopy.notificationActions.copy.text
      })
    })
    const buttons = group.getByRole('button')
    await expect(buttons).toHaveText([
      sharedCopy.notificationActions.copy.text,
      sharedCopy.notificationActions.delete.text
    ])
    await expect(buttons.nth(0)).not.toHaveClass(/govuk-button--secondary/)
    await expect(buttons.nth(1)).toHaveClass(/govuk-button--warning/)
    const deleteButton = page.getByRole('button', {
      name: sharedCopy.notificationActions.delete.text,
      exact: true
    })
    await expect(deleteButton).toHaveCount(1)
    await expect(
      page.getByRole('button', { name: copy.viewHeader.amend })
    ).toHaveCount(0)
    await expect(
      page.getByRole('button', { name: copy.submit.button })
    ).toBeVisible()

    await deleteButton.click()

    await expect(page).toHaveURL(/\/delete$/)
    await expect(
      page.getByRole('heading', { name: deleteCopy.title })
    ).toBeVisible()
  })

  // An address error belongs to a reference that no longer resolves, not to a
  // role nobody has reached yet. A new journey must read as unanswered.
  test('new journey shows no address error before a role has been answered', async ({
    page
  }) => {
    await startNotification(page)
    await page.goto(journeyUrl(page, NOTIFICATION_VIEW_SLUG))

    await expect(missingMarker(page, copy.rows.consignor)).toHaveText(
      copy.missing
    )
    await expect(
      page.getByRole('link', { name: copy.errors.parties.consignor })
    ).toBeHidden()
  })
})

// Design release 1 heads the review page of an unfinished notification with
// "There is a problem", names each unfinished card, marks the card itself, and
// refuses to go on until the notification is complete.
test.describe('check-answers feature unfinished notification', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  // The decision is per card, so every blank row inside a marked card loses its
  // placeholder — the required arrival date and anything optional beside it
  // alike. Only a screen reader is told the answer is missing.
  test('gives every blank row in a marked card no text and a hidden Missing', async ({
    page
  }) => {
    await startNotification(page)
    await page.goto(journeyUrl(page, NOTIFICATION_VIEW_SLUG))

    const card = page.locator(ARRIVAL_DETAILS_ANCHOR)
    const markers = card.locator('.app-summary-list__value--missing')

    await expect(card.getByText(copy.notApplicable)).toHaveCount(0)
    await expect(markers.first()).toHaveText(copy.missing)
  })

  test('names every unfinished card and marks the card it names', async ({
    page
  }) => {
    await startNotification(page)
    await page.goto(journeyUrl(page, NOTIFICATION_VIEW_SLUG))

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
    await expect(page.locator(ARRIVAL_DETAILS_ANCHOR)).toHaveClass(
      /app-summary-card--error/
    )
    await expect(
      page.locator(`${ARRIVAL_DETAILS_ANCHOR} .govuk-error-message`)
    ).toContainText(copy.errors.prefix)
  })

  test('names the unfinished Origin of import, Main import reason and Additional details cards in their own words', async ({
    page
  }) => {
    await startNotification(page)
    await page.goto(journeyUrl(page, NOTIFICATION_VIEW_SLUG))

    // Starting a notification answers the entry page, which finishes Origin of
    // import, so only the other two are outstanding here. The unit test seeds
    // nothing and proves "Complete origin of import".
    await expect(
      page.getByRole('link', { name: copy.errors.cards.importDetails })
    ).toHaveCount(0)

    for (const [key, anchor] of [
      ['reasonForImport', '#reason-for-import'],
      ['additionalAnimalDetails', '#additional-animal-details']
    ]) {
      const message = copy.errors.cards[key]
      await expect(
        page.getByRole('link', { name: message, exact: true })
      ).toHaveAttribute('href', anchor)
      await expect(
        page.locator(`${anchor} .govuk-error-message`)
      ).toContainText(message)
    }
  })

  test('refuses Continue and keeps the trader on the review page', async ({
    page
  }) => {
    await startNotification(page)
    const reviewUrl = journeyUrl(page, NOTIFICATION_VIEW_SLUG)
    await page.goto(reviewUrl)

    await page.getByRole('button', { name: copy.submit.button }).click()

    await expect(page).toHaveURL(`${reviewUrl}?refused=1`)
    await expect(
      page.getByRole('heading', { name: sharedCopy.errorSummary.title })
    ).toBeVisible()
  })

  test('refuses submit of a notification with no commodity line and names what is being imported and the commodity details', async ({
    page
  }) => {
    await startNotification(page)
    const reviewUrl = journeyUrl(page, NOTIFICATION_VIEW_SLUG)
    await page.goto(reviewUrl)

    await page.getByRole('button', { name: copy.submit.button }).click()

    await expect(page).toHaveURL(`${reviewUrl}?refused=1`)
    const importingEntry = page.getByRole('link', {
      name: copy.errors.cards.whatAreYouImporting
    })
    await expect(importingEntry).toBeVisible()
    await expect(importingEntry).toHaveAttribute(
      'href',
      WHAT_ARE_YOU_IMPORTING_ANCHOR
    )
    const importingCard = page.locator(WHAT_ARE_YOU_IMPORTING_ANCHOR)
    await expect(importingCard).toHaveClass(/app-summary-card--error/)
    await expect(importingCard).toContainText(
      copy.errors.cards.whatAreYouImporting
    )
    const detailsEntry = page.getByRole('link', {
      name: copy.errors.cards.commodityDetails
    })
    await expect(detailsEntry).toBeVisible()
    await expect(detailsEntry).toHaveAttribute(
      'href',
      '#description-of-the-goods'
    )
  })

  test('unfinished review has no serious or critical axe violations', async ({
    page
  }) => {
    await startNotification(page)
    await page.goto(journeyUrl(page, NOTIFICATION_VIEW_SLUG))
    await page.getByRole('button', { name: copy.submit.button }).click()

    await expectNoSeriousOrCriticalAxeViolations(
      page,
      'Unfinished check answers'
    )
  })
})

// Design release 1 renders no form on the review page once a notification is
// submitted: the read-only review is a record of what was sent, ending with the
// last card. It must not still invite the trader to submit a notification that
// is already submitted.
test.describe('check-answers feature submitted notification', () => {
  test.describe.configure({ timeout: 90000 })

  let reference

  test.beforeEach(async ({ page }) => {
    await signIn(page)
    await startNotification(page)
    await completeAnswerSections(page)
    await uploadHealthCertificate(page)
    await openReviewFromHub(page)
    await page.getByRole('button', { name: copy.submit.button }).click()
    await page
      .getByRole('checkbox', { name: /I confirm that I have reviewed/ })
      .check()
    await page.getByRole('button', { name: 'Continue' }).click()
    reference = journeyIdFromPage(page)
    await page.goto(BASE)
    await page
      .getByRole('link', {
        name: `View ${dashboardCopy.actionHidden(reference)}`
      })
      .click()
    await expect(
      page.getByRole('heading', { level: 1, name: reference, exact: true })
    ).toBeVisible()
  })

  test('is headed by its reference with a Submitted tag and no status bar, and titled by its reference', async ({
    page
  }) => {
    const tag = page
      .getByRole('main')
      .getByText(sharedCopy.journeyStrip.submitted, { exact: true })
    await expect(tag).toBeVisible()
    await expect(tag).toHaveClass(/govuk-tag--green/)
    await expect(page.locator('.app-journey-strip')).toHaveCount(0)
    await expect(page.getByRole('heading', { name: copy.title })).toHaveCount(0)
    await expect(page).toHaveTitle(
      `${reference} - ${sharedCopy.layout.serviceName} - ${sharedCopy.layout.govukSuffix}`
    )
  })

  test('shows the date it was submitted under its header', async ({ page }) => {
    await expect(
      page.getByText(
        new RegExp(
          `^${copy.viewHeader.dateSubmitted('\\d{1,2} [A-Z][a-z]+ \\d{4}')}$`
        )
      )
    ).toBeVisible()
  })

  test("Back on a submitted notification's view goes to the notification list", async ({
    page
  }) => {
    await page.getByRole('link', { name: 'Back', exact: true }).click()

    await expect(page).toHaveURL(urlUnderBase('/?'))
    await expect(
      page.getByRole('heading', { level: 1, name: dashboardCopy.title })
    ).toBeVisible()
  })

  test('offers Amend this notification, a secondary Copy as new and a red Delete in its header', async ({
    page
  }) => {
    const group = page.locator(BUTTON_GROUP).filter({
      has: page.getByRole('button', {
        name: copy.viewHeader.amend,
        exact: true
      })
    })
    const buttons = group.getByRole('button')

    await expect(buttons).toHaveText([
      copy.viewHeader.amend,
      sharedCopy.notificationActions.copy.text,
      sharedCopy.notificationActions.delete.text
    ])
    await expect(buttons.nth(0)).not.toHaveClass(
      /govuk-button--(secondary|warning)/
    )
    await expect(buttons.nth(1)).toHaveClass(/govuk-button--secondary/)
    await expect(buttons.nth(2)).toHaveClass(/govuk-button--warning/)
    await expect(buttons.nth(2)).toHaveAttribute('href', /\/delete$/)
  })

  test('Amend this notification starts the amendment', async ({ page }) => {
    await page
      .getByRole('button', { name: copy.viewHeader.amend, exact: true })
      .click()

    await expect(page).toHaveURL(new RegExp(`/notifications/${reference}$`))
    await expect(
      page
        .getByRole('main')
        .getByText(sharedCopy.journeyStrip.amend, { exact: true })
    ).toBeVisible()
  })

  test('Delete in the header opens the delete confirmation', async ({
    page
  }) => {
    await page
      .getByRole('button', {
        name: sharedCopy.notificationActions.delete.text,
        exact: true
      })
      .click()

    await expect(page).toHaveURL(/\/delete$/)
    await expect(
      page.getByRole('heading', { name: deleteCopy.title })
    ).toBeVisible()
  })

  test('shows the import reference numbers as plain text, with no Copy button, without JavaScript', async ({
    page,
    browser
  }) => {
    const context = await browser.newContext({
      javaScriptEnabled: false,
      storageState: await page.context().storageState()
    })
    const noJs = await context.newPage()

    await noJs.goto(
      `${BASE}/notifications/${reference}/${NOTIFICATION_VIEW_SLUG}`
    )

    const region = noJs.getByRole('region', {
      name: copy.importReferences.heading
    })
    await expect(region).toContainText(copy.importReferences.warning)
    await expect(
      rowFor(noJs, copy.importReferences.notificationReference).getByRole(
        'definition'
      )
    ).toHaveText(reference)
    await expect(
      rowFor(noJs, copy.importReferences.customsDocumentCode).getByRole(
        'definition'
      )
    ).toHaveText('C640')
    await expect(region.getByRole('button')).toHaveCount(0)

    await context.close()
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
    await expectNoSeriousOrCriticalAxeViolations(
      page,
      'Submitted check answers'
    )
  })
})

test.describe('check-answers feature submitted notification still owed its health certificate', () => {
  test.describe.configure({ timeout: 90000 })

  let reference

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
    reference = journeyIdFromPage(page)
    await page.goto(BASE)
    await page
      .getByRole('link', {
        name: `View ${dashboardCopy.actionHidden(reference)}`
      })
      .click()
    await expect(
      page.getByRole('heading', { level: 1, name: reference, exact: true })
    ).toBeVisible()
  })

  test('is tagged Submitted action required in orange and warns that a health certificate is needed', async ({
    page
  }) => {
    const tag = page
      .getByRole('main')
      .getByText(sharedCopy.journeyStrip.submittedActionRequired, {
        exact: true
      })
    await expect(tag).toBeVisible()
    await expect(tag).toHaveClass(/govuk-tag--orange/)
    await expect(
      page.locator('.govuk-warning-text').filter({
        hasText: copy.viewHeader.healthCertificateWarning
      })
    ).toBeVisible()
    await expect(page.getByRole('link', { name: /^Change/ })).toHaveCount(0)
  })

  test('shows Upload a valid health certificate in place of the document cards, with no error summary', async ({
    page
  }) => {
    await expect(
      page.getByText(copy.errors.uploadHealthCertificate)
    ).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Document 1' })).toHaveCount(
      0
    )
    await expect(page.locator('.govuk-error-summary')).toHaveCount(0)
  })

  test('offers Amend this notification, a secondary Copy as new and a red Delete in its header', async ({
    page
  }) => {
    const group = page.locator(BUTTON_GROUP).filter({
      has: page.getByRole('button', {
        name: copy.viewHeader.amend,
        exact: true
      })
    })
    const buttons = group.getByRole('button')

    await expect(buttons).toHaveText([
      copy.viewHeader.amend,
      sharedCopy.notificationActions.copy.text,
      sharedCopy.notificationActions.delete.text
    ])
    await expect(buttons.nth(1)).toHaveClass(/govuk-button--secondary/)
    await expect(buttons.nth(2)).toHaveClass(/govuk-button--warning/)
  })

  test('Continue starts an amendment and opens Overview', async ({ page }) => {
    await page
      .getByRole('button', { name: copy.submit.button, exact: true })
      .click()

    await expect(page).toHaveURL(new RegExp(`/notifications/${reference}$`))
    await expect(
      page
        .getByRole('main')
        .getByText(sharedCopy.journeyStrip.amend, { exact: true })
    ).toBeVisible()
  })

  test('Continue starts an amendment without JavaScript', async ({
    page,
    browser
  }) => {
    const context = await browser.newContext({
      javaScriptEnabled: false,
      storageState: await page.context().storageState()
    })
    const noJs = await context.newPage()

    await noJs.goto(
      `${BASE}/notifications/${reference}/${NOTIFICATION_VIEW_SLUG}`
    )
    await noJs
      .getByRole('button', { name: copy.submit.button, exact: true })
      .click()

    await expect(noJs).toHaveURL(new RegExp(`/notifications/${reference}$`))
    await expect(
      noJs
        .getByRole('main')
        .getByText(sharedCopy.journeyStrip.amend, { exact: true })
    ).toBeVisible()

    await context.close()
  })

  test('has no serious or critical axe violations', async ({ page }) => {
    await expectNoSeriousOrCriticalAxeViolations(
      page,
      'Submitted action required check answers'
    )
  })
})

test.describe('check-answers feature amendment', () => {
  test.describe.configure({ timeout: 90000 })

  const cancelAmendButton = (page) =>
    page.getByRole('button', {
      name: copy.cancelAmend.button,
      exact: true
    })

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
      .getByRole('button', { name: `Amend notification ${reference}` })
      .click()
    await openReviewFromHub(page)
    await expect(
      page.getByRole('heading', { level: 1, name: copy.title })
    ).toBeVisible()
  })

  test('opens headed Review your notification with no errors, ending with Continue, Cancel amend and Delete', async ({
    page
  }) => {
    await expect(
      page.getByRole('heading', { level: 1, name: copy.title })
    ).toBeVisible()
    await expect(page).toHaveTitle(new RegExp(`^${copy.title} - `))
    await expect(
      page.getByRole('heading', { name: sharedCopy.errorSummary.title })
    ).toHaveCount(0)

    await expect(
      page.getByRole('button', { name: copy.submit.button })
    ).toBeVisible()
    await expect(cancelAmendButton(page)).toHaveAttribute(
      'href',
      /\/cancel-amend$/
    )
    await expect(cancelAmendButton(page)).toHaveClass(/govuk-button--secondary/)
    const deleteButton = page.getByRole('button', {
      name: sharedCopy.notificationActions.delete.text,
      exact: true
    })
    await expect(deleteButton).toHaveAttribute('href', /\/delete$/)
    await expect(deleteButton).toHaveClass(/govuk-button--warning/)
    await expect(
      page.getByRole('link', {
        name: sharedCopy.journeyStrip.cancelAmend,
        exact: true
      })
    ).toHaveCount(0)
  })

  test('is retitled Review before re-submitting once an answer changes', async ({
    page
  }) => {
    await cardChangeLink(page, 'origin of import').click()
    await page.getByLabel(INTERNAL_REFERENCE_LABEL).fill('RESUBMIT-REF')
    await page
      .getByRole('button', {
        name: sharedCopy.saveActions.saveAndReturn,
        exact: true
      })
      .click()

    await expect(
      page.getByRole('heading', { level: 1, name: copy.resubmitTitle })
    ).toBeVisible()
    await expect(page).toHaveTitle(new RegExp(`^${copy.resubmitTitle}`))
  })

  test('refuses Continue on an incomplete amendment and names what is missing', async ({
    page
  }) => {
    await page.goto(journeyUrl(page))
    await page.getByRole('link', { name: 'Arrival details' }).click()
    await page.getByLabel('Arrival date at port of entry').fill('')
    await page
      .getByRole('button', {
        name: sharedCopy.saveActions.saveAndReturnToHub
      })
      .click()
    await openReviewFromHub(page)

    await expect(
      page.getByRole('heading', { name: sharedCopy.errorSummary.title })
    ).toHaveCount(0)

    await page.getByRole('button', { name: copy.submit.button }).click()

    await expect(page).toHaveURL(new RegExp(`${NOTIFICATION_VIEW_SLUG}$`))
    await expect(
      page.getByRole('heading', { name: sharedCopy.errorSummary.title })
    ).toBeVisible()
    await expect(
      page.getByRole('link', { name: copy.errors.cards.arrivalDetails })
    ).toBeVisible()
  })

  test('amendment review has no serious or critical axe violations', async ({
    page
  }) => {
    await expectNoSeriousOrCriticalAxeViolations(
      page,
      'Amendment check answers'
    )
  })
})

test.describe('check-answers feature copied addresses', () => {
  test.describe.configure({ timeout: 90000 })

  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('reads each copied address back as name, address lines and country, one per line, with no telephone or email', async ({
    page
  }) => {
    await startNotification(page)
    await completeAnswerSections(page)
    await openReviewFromHub(page)

    await expect(
      rowFor(page, copy.rows.consignor).locator('.govuk-summary-list__value')
    ).toHaveJSProperty(
      'innerText',
      'Astra Rosales\n43 East Hague Extension\nBern\n30055\nSwitzerland'
    )
    await expect(
      rowFor(page, copy.rows.contactAddress).locator(
        '.govuk-summary-list__value'
      )
    ).toHaveJSProperty(
      'innerText',
      'Animal and Plant Health Agency\nWoodham Lane\nAddlestone\nKT15 3NB\nUnited Kingdom'
    )
    await expect(page.getByText('01632 960000')).toHaveCount(0)
    await expect(
      page.getByText('animal-and-plant-health-agency@example.com')
    ).toHaveCount(0)
  })
})

test.describe('check-answers feature commodity read-back', () => {
  test.describe.configure({ timeout: 90000 })

  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('reads the commodity selection back in What are you importing? and the species in a block under its commodity card', async ({
    page
  }) => {
    await startNotification(page)
    await unlockSections(page)
    await page.goto(journeyUrl(page, NOTIFICATION_VIEW_SLUG))

    const importing = page.locator(WHAT_ARE_YOU_IMPORTING_ANCHOR)
    await expect(importing.getByRole('term')).toHaveText([
      copy.rows.commodityCode,
      copy.rows.commonName,
      copy.rows.species
    ])
    await expect(importing.getByRole('definition')).toHaveText([
      '01061900',
      'Cat',
      FELIS_CATUS
    ])
    await expect(
      cardChangeLink(page, copy.hidden.cards.whatAreYouImporting)
    ).toHaveAttribute('href', /\/notifications\/[^/]+\/commodities\?change=1$/)

    const details = page.locator(COMMODITY_DETAILS_ANCHOR)
    await expect(details.getByRole('heading', { level: 3 })).toHaveText(
      'Cat (01061900)'
    )
    await expect(details.getByRole('heading', { level: 4 })).toHaveText(
      FELIS_CATUS
    )
    await expect(details.getByRole('term')).toHaveText([
      copy.rows.numberOfAnimals,
      copy.rows.numberOfPackages
    ])
    await expect(
      details.getByRole('term').filter({ hasText: copy.rows.commodityCode })
    ).toHaveCount(0)
    await expect(details).not.toHaveClass(/app-summary-card--error/)

    const rowLink = page.getByRole('link', {
      name: `${copy.change} ${copy.hidden.numberOfAnimalsFor(FELIS_CATUS)}`
    })
    await expect(rowLink).toHaveAttribute(
      'href',
      /consignment-details\?change=1$/
    )
    await expect(cardChangeLink(page, 'Cat (01061900)')).toHaveAttribute(
      'href',
      /consignment-details\?change=1$/
    )

    await rowLink.click()
    await expect(page).toHaveURL(/\/consignment-details\?change=1$/)
  })

  test('names unfinished commodity details, linking to the first commodity card without marking it', async ({
    page
  }) => {
    await startNotification(page)
    await answerCountryOfOrigin(page)
    await page.getByRole('link', { name: WHAT_ARE_YOU_IMPORTING }).click()
    await selectSpecies(page, [FELIS_CATUS_SPECIES])
    await page.getByRole('button', { name: SAVE_AND_CONTINUE }).click()
    await page.goto(journeyUrl(page, NOTIFICATION_VIEW_SLUG))

    await expect(
      page.getByRole('link', { name: copy.errors.cards.commodityDetails })
    ).toHaveAttribute('href', COMMODITY_DETAILS_ANCHOR)
    const details = page.locator(COMMODITY_DETAILS_ANCHOR)
    await expect(details).not.toHaveClass(/app-summary-card--error/)
    await expect(details.locator('.govuk-error-message')).toHaveCount(0)
  })

  test('heads the identifier table Identification details, labels each animal by species and number, and links it to the identification page', async ({
    page
  }) => {
    await startNotification(page)
    await unlockSections(page, BOS_TAURUS_SPECIES)
    await page.goto(journeyUrl(page, IDENTIFICATION_SLUG))
    await page.locator('#animalIdentifierEarTag-0').fill('UK1')
    await page.getByRole('button', { name: SAVE_AND_CONTINUE }).click()
    await page.goto(journeyUrl(page, NOTIFICATION_VIEW_SLUG))

    const details = page.locator(COMMODITY_DETAILS_ANCHOR)
    await expect(details.getByRole('heading', { level: 5 })).toHaveText(
      copy.identifierTable.heading
    )
    await expect(details.getByRole('columnheader')).toHaveText([
      copy.identifierTable.animalColumn,
      'Ear tag',
      'Passport'
    ])
    await expect(
      details.getByRole('cell', { name: 'Bos taurus 1', exact: true })
    ).toBeVisible()

    const changeLink = page.getByRole('link', {
      name: `${copy.change} ${copy.hidden.identificationDetailsFor(BOS_TAURUS_HEADING)}`
    })
    await expect(changeLink).toHaveAttribute(
      'href',
      /\/commodities\/identification\?change=1$/
    )
    await changeLink.click()
    await expect(page).toHaveURL(/\/commodities\/identification\?change=1$/)
  })

  test('names each species short of its number of animals, linking to its block', async ({
    page
  }) => {
    await startNotification(page)
    await answerCountryOfOrigin(page)
    await page.getByRole('link', { name: WHAT_ARE_YOU_IMPORTING }).click()
    await selectSpecies(page, [BOS_TAURUS_SPECIES, FELIS_CATUS_SPECIES])
    await page.getByRole('button', { name: SAVE_AND_CONTINUE }).click()
    await page.goto(journeyUrl(page, NOTIFICATION_VIEW_SLUG))

    await expect(
      page.getByRole('link', {
        name: copy.errors.species.numberOfAnimals(BOS_TAURUS_LOWER)
      })
    ).toHaveAttribute('href', SPECIES_1_HREF)
    await expect(
      page.getByRole('link', {
        name: copy.errors.species.numberOfAnimals(FELIS_CATUS_LOWER)
      })
    ).toHaveAttribute('href', SPECIES_2_HREF)
    await expect(page.locator(SPECIES_1_HREF)).toHaveText(BOS_TAURUS_HEADING)
    await expect(page.locator(SPECIES_2_HREF)).toHaveText(FELIS_CATUS)
    await expect(page.locator(COMMODITY_DETAILS_ANCHOR)).not.toHaveClass(
      /app-summary-card--error/
    )
    await expectNoSeriousOrCriticalAxeViolations(
      page,
      'Review naming species short of a count'
    )
  })

  test('names each counted species short of an identifier, linking to its block', async ({
    page
  }) => {
    await startNotification(page)
    await answerCountryOfOrigin(page)
    await page.getByRole('link', { name: WHAT_ARE_YOU_IMPORTING }).click()
    await selectSpecies(page, [BOS_TAURUS_SPECIES, FELIS_CATUS_SPECIES])
    await page.getByRole('button', { name: SAVE_AND_CONTINUE }).click()
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
    await page.getByRole('link', { name: 'Commodity details' }).click()
    await page.locator('#numberOfAnimalsQuantity-0').fill('1')
    await page.locator('#numberOfAnimalsQuantity-1').fill('1')
    for (const box of await page
      .locator('input[name^="numberOfPackages-"]')
      .all()) {
      await box.fill('1')
    }
    await page.getByRole('button', { name: SAVE_AND_CONTINUE }).click()
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
    await page.goto(journeyUrl(page, NOTIFICATION_VIEW_SLUG))

    await expect(
      page.getByRole('link', {
        name: copy.errors.species.atLeastOneIdentifier(BOS_TAURUS_LOWER)
      })
    ).toHaveAttribute('href', SPECIES_1_HREF)
    await expect(
      page.getByRole('link', {
        name: copy.errors.species.atLeastOneIdentifier(FELIS_CATUS_LOWER)
      })
    ).toHaveAttribute('href', SPECIES_2_HREF)
    await expect(
      page.getByRole('link', {
        name: copy.errors.species.numberOfAnimals(BOS_TAURUS_LOWER)
      })
    ).toHaveCount(0)
  })
})
