import { expect, test } from '@playwright/test'
import { copy as additionalDetailsCopy } from '../src/server/app/sets/live-animals/journeys/linear/features/additional-details/copy/copy.en.js'
import { copy as checkAnswersCopy } from '../src/server/app/sets/live-animals/journeys/linear/features/check-answers/copy/copy.en.js'
import { copy as commoditiesCopy } from '../src/server/app/sets/live-animals/journeys/linear/features/commodities/copy/copy.en.js'
import { copy as hubCopy } from '../src/server/app/sets/live-animals/journeys/linear/features/hub/copy/copy.en.js'
import { copy as importReasonCopy } from '../src/server/app/sets/live-animals/journeys/linear/features/import-reason/copy/copy.en.js'
import { copy as originCopy } from '../src/server/app/sets/live-animals/journeys/linear/features/origin/copy/copy.en.js'
import { copy as transportCopy } from '../src/server/app/sets/live-animals/journeys/linear/features/transport/copy/copy.en.js'
import {
  addDocument,
  BASE,
  BOS_TAURUS_ROW,
  FELIS_CATUS_ROW,
  answerAdditionalDetails,
  answerAnimalIdentification,
  answerArrivalDetails,
  answerCommodityCounts,
  answerContactAddress,
  answerImportReason,
  answerRolesAndAddresses,
  answerTransitCountries,
  answerTransporter,
  saveAndContinueToImportReason,
  chooseCountryOfOrigin,
  completeAnswerSections,
  documentRowFor,
  errorSummary,
  expectLanding,
  expectSpeciesSelected,
  journeyUrl,
  LANDINGS,
  openNotificationView,
  openOverview,
  openReviewFromHub,
  saveAndExpectLanding,
  selectSpecies,
  signIn,
  startNotification,
  urlUnderBase,
  values
} from './live-animals-journey.js'

const exactHeading = (page, name) =>
  page.getByRole('heading', { name, exact: true })

const followBack = (page) =>
  page.getByRole('link', { name: 'Back', exact: true }).click()

const saveAndContinueToAdditionalDetails = async (page) => {
  await saveAndContinueToImportReason(page)
  await answerImportReason(page)
  await answerCommodityCounts(page)
  await answerAnimalIdentification(page)
  await expect(exactHeading(page, additionalDetailsCopy.title)).toBeVisible()
}

test.describe('live-animals journey glue', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('Save and continue carries a fresh notification through the entry guard on past the additional details', async ({
    page
  }) => {
    const heading = (name) => page.getByRole('heading', { name })
    const save = () =>
      page.getByRole('button', { name: 'Save and continue' }).click()

    await page.goto(BASE)
    await page.getByRole('button', { name: 'Start a new notification' }).click()
    await expect(heading(originCopy.title)).toBeVisible()

    await page.goto(journeyUrl(page, 'origin'))
    await expect(heading(originCopy.title)).toBeVisible()

    await chooseCountryOfOrigin(page)
    await page.getByRole('radio', { name: 'No' }).check()
    await save()
    await expect(heading(commoditiesCopy.search.title)).toBeVisible()

    await selectSpecies(page, [FELIS_CATUS_ROW])
    await save()
    await expect(heading(importReasonCopy.title)).toBeVisible()

    await page.getByRole('radio', { name: 'Internal market' }).check()
    await expect(
      page.getByRole('group', { name: 'Purpose in the internal market' })
    ).toBeVisible()

    await page.getByRole('radio', { name: 'Breeding' }).check()
    await save()
    await expect(
      heading(commoditiesCopy.consignmentDetails.title)
    ).toBeVisible()

    await page.getByLabel('Number of animals').fill('2')
    await save()
    await expect(
      page.getByRole('heading', {
        name: commoditiesCopy.identification.title,
        exact: true
      })
    ).toBeVisible()

    await save()
    await expect(
      page.getByRole('heading', {
        name: additionalDetailsCopy.title,
        exact: true
      })
    ).toBeVisible()

    await page.getByRole('radio', { name: 'Slaughter' }).check()
    await save()
    await expect(heading(transportCopy.portOfEntry.title)).toBeVisible()

    await page.goto(journeyUrl(page))
    await expect(heading(hubCopy.title)).toBeVisible()

    await page.goto(journeyUrl(page, 'origin'))
    await expect(heading(originCopy.title)).toBeVisible()
    await save()
    await expect(heading(commoditiesCopy.search.title)).toBeVisible()
  })

  test('Save and continue carries a new notification through to the review page in one pass', async ({
    page
  }) => {
    test.slow()
    const heading = (name) => page.getByRole('heading', { name })

    await saveAndContinueToImportReason(page)

    await answerImportReason(page)
    await answerCommodityCounts(page)
    await answerAnimalIdentification(page)
    await answerAdditionalDetails(page)

    await expect(heading(transportCopy.portOfEntry.title)).toBeVisible()
    await answerArrivalDetails(page)
    await answerTransitCountries(page)
    await answerTransporter(page)

    await expect(page).toHaveURL(
      urlUnderBase('/notifications/[^/]+/accompanying-documents')
    )
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await answerRolesAndAddresses(page)
    await expect(page).toHaveURL(
      urlUnderBase('/notifications/[^/]+/consignment/contact/select')
    )
    await answerContactAddress(page)

    await expect(page).toHaveURL(
      urlUnderBase('/notifications/[^/]+/notification-view')
    )
    await expect(heading(checkAnswersCopy.title)).toBeVisible()
  })

  test('following Back and choosing Save and continue carries on to the next step', async ({
    page
  }) => {
    const saveAndContinue = () =>
      page.getByRole('button', { name: 'Save and continue' }).click()

    await saveAndContinueToImportReason(page)

    await followBack(page)
    await expect(exactHeading(page, commoditiesCopy.search.title)).toBeVisible()
    await expectSpeciesSelected(page, BOS_TAURUS_ROW)

    await saveAndContinue()
    await expect(exactHeading(page, importReasonCopy.title)).toBeVisible()

    await followBack(page)
    await followBack(page)
    await expect(exactHeading(page, originCopy.title)).toBeVisible()

    await saveAndContinue()
    await expect(exactHeading(page, commoditiesCopy.search.title)).toBeVisible()
  })

  test('after Save and continue, Back from Commodity details opens Main import reason', async ({
    page
  }) => {
    await saveAndContinueToImportReason(page)
    await answerImportReason(page)
    await expect(
      exactHeading(page, commoditiesCopy.consignmentDetails.title)
    ).toBeVisible()

    await followBack(page)
    await expect(exactHeading(page, importReasonCopy.title)).toBeVisible()
  })

  test('after Save and continue, Back from Additional details opens Identification details', async ({
    page
  }) => {
    await saveAndContinueToAdditionalDetails(page)

    await followBack(page)

    await expect(
      exactHeading(page, commoditiesCopy.identification.title)
    ).toBeVisible()
  })

  test('after Save and continue, Back from the transit countries opens the arrival details', async ({
    page
  }) => {
    await saveAndContinueToAdditionalDetails(page)
    await answerAdditionalDetails(page)
    await answerArrivalDetails(page)
    await expect(
      exactHeading(page, transportCopy.transitCountries.title)
    ).toBeVisible()

    await followBack(page)

    await expect(
      exactHeading(page, transportCopy.portOfEntry.title)
    ).toBeVisible()
  })

  test('Save and continue ends on the review page, naming what is outstanding, when the notification is incomplete', async ({
    page
  }) => {
    const heading = (name) => page.getByRole('heading', { name })

    await saveAndContinueToImportReason(page)

    await page.goto(journeyUrl(page, 'consignment/contact/select'))
    await answerContactAddress(page)

    await expect(page).toHaveURL(
      urlUnderBase('/notifications/[^/]+/notification-view')
    )
    await expect(heading(checkAnswersCopy.title)).toBeVisible()
    const summary = errorSummary(page)
    await expect(summary).toContainText('There is a problem')
    await expect(summary).toContainText('Complete main import reason')
    await expect(summary).toContainText('Complete roles and addresses')
  })

  test('a notification created in another session, holding no answers, is sent back to the entry page', async ({
    page,
    browser
  }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: 'Start a new notification' }).click()
    await expect(
      page.getByRole('heading', { name: originCopy.title })
    ).toBeVisible()
    const hubUrl = new URL(journeyUrl(page), page.url()).toString()

    const stranger = await browser.newContext()
    const strangerPage = await stranger.newPage()
    await strangerPage.goto(hubUrl)

    await expect(strangerPage).toHaveURL(`${hubUrl}/origin`)
    await expect(
      strangerPage.getByRole('heading', { name: originCopy.title })
    ).toBeVisible()
    await stranger.close()
  })

  test('Back steps through the pages Save and continue visited in reverse, ending on Overview', async ({
    page
  }) => {
    test.slow()
    const review = { slug: 'notification-view', title: checkAnswersCopy.title }
    const pagesVisited = [
      LANDINGS.transitCountries,
      LANDINGS.transporters,
      LANDINGS.documents,
      LANDINGS.addresses,
      LANDINGS.contactAddress,
      review
    ]
    await startNotification(page)
    await completeAnswerSections(page)
    await page.getByRole('link', { name: 'Arrival details' }).click()
    await expectLanding(page, LANDINGS.arrivalDetails)

    for (const landing of pagesVisited) {
      await saveAndExpectLanding(page, landing)
    }

    const pagesBackThrough = [
      ...pagesVisited.slice(0, -1).reverse(),
      LANDINGS.arrivalDetails
    ]
    for (const landing of pagesBackThrough) {
      await followBack(page)
      await expectLanding(page, landing)
    }
    await followBack(page)
    await expect(page).toHaveURL(urlUnderBase('/notifications/[^/]+'))
    await expect(exactHeading(page, hubCopy.title)).toBeVisible()
  })

  test('collection changes from check answers keep the trail until their explicit exits', async ({
    page
  }) => {
    test.slow()
    const documentsOnTheReviewTrail =
      /\/accompanying-documents\?from=(?:[^#]*%2C)?notification-view(?:&|$)/
    const identificationOnTheReviewTrail =
      /\/identification\?from=(?:[^#]*%2C)?notification-view(?:#identification-card-0)?$/
    await startNotification(page)
    await completeAnswerSections(page)

    const [document] = values.documents
    await page.getByRole('link', { name: 'Upload documents' }).click()
    await addDocument(page, document)
    await expect(
      documentRowFor(page, document.accompanyingDocumentReference)
    ).toContainText('Check completed')
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await openOverview(page)
    await openReviewFromHub(page)

    await page.goto(
      `${journeyUrl(page, 'commodities/identification')}?from=notification-view`
    )
    await expect(page).toHaveURL(identificationOnTheReviewTrail)
    await page
      .getByRole('button', { name: 'Remove animal 1', exact: true })
      .click()
    await expect(page).toHaveURL(identificationOnTheReviewTrail)
    await page.getByLabel('Ear tag', { exact: true }).fill('UK000000000002')
    await expect(
      page.getByRole('button', { name: 'Save and add another' })
    ).toHaveCount(0)
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(exactHeading(page, additionalDetailsCopy.title)).toBeVisible()
    await openNotificationView(page)
    await expect(page.getByText('UK000000000002')).toBeVisible()

    const secondDocument = {
      accompanyingDocumentReference: 'INV-2026-0042',
      accompanyingDocumentType: 'COMMERCIAL_INVOICE',
      accompanyingDocumentDateOfIssue: { day: '3', month: '1', year: '2026' },
      filename: 'commercial-invoice.pdf'
    }
    await page.getByRole('link', { name: 'Change uploaded documents' }).click()
    await expect(page).toHaveURL(documentsOnTheReviewTrail)
    await addDocument(page, secondDocument)
    await expect(page).toHaveURL(documentsOnTheReviewTrail)
    await expect(
      documentRowFor(page, secondDocument.accompanyingDocumentReference)
    ).toContainText('Check completed')
    await expect(page).toHaveURL(documentsOnTheReviewTrail)
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(exactHeading(page, 'Consignment addresses')).toBeVisible()
    await openNotificationView(page)
    await expect(
      page.getByText(secondDocument.accompanyingDocumentReference)
    ).toBeVisible()
  })
})
