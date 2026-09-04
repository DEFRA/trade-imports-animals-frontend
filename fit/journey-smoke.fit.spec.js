import { expect, test } from '@playwright/test'
import {
  addDocument,
  chooseCountryOfOrigin,
  completeAnswerSections,
  journeyUrl,
  selectSpecies,
  signIn,
  startNotification,
  values
} from './live-animals-journey.js'

test.describe('live-animals journey glue', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('entry guards and the page-owned opening spine carry a fresh notification to the hub', async ({
    page
  }) => {
    const heading = (name) => page.getByRole('heading', { name })
    const save = () =>
      page.getByRole('button', { name: 'Save and continue' }).click()

    await page.goto('/')
    await page.getByRole('button', { name: 'Start a new notification' }).click()
    await expect(heading('Origin of the import')).toBeVisible()

    // The entry page is exempt from the guard, so revisiting it is not a
    // redirect loop.
    await page.goto(journeyUrl(page, 'origin'))
    await expect(heading('Origin of the import')).toBeVisible()

    await chooseCountryOfOrigin(page)
    await page.getByRole('radio', { name: 'No' }).check()
    await save()
    await expect(heading('What are you importing?')).toBeVisible()

    await selectSpecies(page, ['Felis catus'])
    await save()
    await expect(heading('Commodity details')).toBeVisible()

    await page.getByLabel('Number of animals').fill('2')
    await save()
    await expect(
      heading('What is the main reason for importing the animals?')
    ).toBeVisible()

    await page.getByRole('radio', { name: 'Internal market' }).check()
    await save()
    await expect(heading('Purpose in the internal market')).toBeVisible()

    await page.getByRole('radio', { name: 'Breeding' }).check()
    await save()
    await expect(
      page.getByRole('heading', { name: 'Identification details', exact: true })
    ).toBeVisible()

    await page.getByRole('button', { name: 'Save and finish' }).click()
    await expect(
      page.getByRole('heading', { name: 'Additional details', exact: true })
    ).toBeVisible()

    await page.getByRole('radio', { name: 'Slaughter' }).check()
    await save()
    await expect(heading('Overview')).toBeVisible()

    // Completing the opening run ends run mode, so later task saves return to
    // the ordinary hub resting state.
    await page.goto(journeyUrl(page, 'origin'))
    await expect(heading('Origin of the import')).toBeVisible()
    await save()
    await expect(heading('Overview')).toBeVisible()
  })

  test('a notification created in another session, holding no answers, is sent back to the entry page', async ({
    page,
    browser
  }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Start a new notification' }).click()
    await expect(
      page.getByRole('heading', { name: 'Origin of the import' })
    ).toBeVisible()
    const hubUrl = new URL(journeyUrl(page), page.url()).toString()

    const stranger = await browser.newContext()
    const strangerPage = await stranger.newPage()
    await strangerPage.goto(hubUrl)

    await expect(strangerPage).toHaveURL(`${hubUrl}/origin`)
    await expect(
      strangerPage.getByRole('heading', { name: 'Origin of the import' })
    ).toBeVisible()
    await stranger.close()
  })

  test('collection changes from check answers retain change context until their explicit exits', async ({
    page
  }) => {
    test.slow()
    await startNotification(page)
    await completeAnswerSections(page)

    const [document] = values.documents
    await page.getByRole('link', { name: 'Uploaded documents' }).click()
    await addDocument(page, document)
    await expect(
      page.locator('.govuk-table__row', {
        hasText: document.accompanyingDocumentReference
      })
    ).toContainText('Safe')
    await page.getByRole('button', { name: 'Continue' }).click()

    await page.getByRole('link', { name: 'Check and submit' }).click()

    await page
      .getByRole('link', { name: 'Change animal identifiers for commodity 1' })
      .click()
    await expect(page).toHaveURL(
      /\/identification\?change=1(?:#identification-card-0)?$/
    )
    await page
      .getByRole('button', { name: 'Remove animal 1', exact: true })
      .click()
    await expect(page).toHaveURL(
      /\/identification\?change=1(?:#identification-card-0)?$/
    )
    await page.getByLabel('Ear tag number').fill('UK000000000002')
    await page.getByRole('button', { name: 'Save and add another' }).click()
    await expect(page).toHaveURL(
      /\/identification\?change=1(?:#identification-card-0)?$/
    )
    await page.getByRole('button', { name: 'Save and finish' }).click()
    await expect(page).toHaveURL(/\/notification-view(?:#.*)?$/)
    await expect(page.getByText('UK000000000002')).toBeVisible()

    const secondDocument = {
      accompanyingDocumentReference: 'INV-2026-0042',
      accompanyingDocumentDateOfIssue: { day: '3', month: '1', year: '2026' },
      filename: 'commercial-invoice.pdf'
    }
    await page.getByRole('link', { name: 'Change documents' }).click()
    await expect(page).toHaveURL(
      /\/accompanying-documents\?change=1(?:&attempt=\d+)?$/
    )
    await addDocument(page, secondDocument)
    await expect(page).toHaveURL(
      /\/accompanying-documents\?change=1(?:&attempt=\d+)?$/
    )
    await expect(
      page.locator('.govuk-table__row', {
        hasText: secondDocument.accompanyingDocumentReference
      })
    ).toContainText('Safe')
    await expect(page).toHaveURL(
      /\/accompanying-documents\?change=1(?:&attempt=\d+)?$/
    )
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page).toHaveURL(/\/notification-view(?:#.*)?$/)
    await expect(
      page.getByText(secondDocument.accompanyingDocumentReference)
    ).toBeVisible()
  })
})
