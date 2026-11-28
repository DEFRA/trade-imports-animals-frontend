import { expect, test } from '@playwright/test'
import {
  BASE,
  LANDINGS,
  BOS_TAURUS_ROW,
  chooseMeansAndSave,
  copyNotification,
  createAnsweredNotification,
  expectNoSeriousOrCriticalViolations,
  expectSpeciesSelected,
  journeyIdFromPage,
  labelFor,
  openFromOverviewRow,
  signIn,
  taskRow,
  values
} from '../../../../../../../../../fit/live-animals-journey.js'
import { copy as commoditiesCopy } from '../commodities/copy/copy.en.js'
import { copy as hubCopy } from '../hub/copy/copy.en.js'
import { copy as originCopy } from '../origin/copy/copy.en.js'
import { copy as transportCopy } from '../transport/copy/copy.en.js'

const expectRowStatus = (page, title, status) =>
  expect(taskRow(page, title)).toContainText(status)

test.describe('notification-actions feature', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('copy creates a separate draft notification', async ({ page }) => {
    const sourceReference = await createAnsweredNotification(page)

    await copyNotification(page, sourceReference)

    await expect(
      page.getByRole('heading', { name: hubCopy.title })
    ).toBeVisible()
    const copiedReference = journeyIdFromPage(page)
    expect(copiedReference).not.toBe(sourceReference)
    await expect(page.getByText('Draft', { exact: true })).toBeVisible()
  })

  test('copy keeps the trade answers and clears the shipment answers', async ({
    page
  }) => {
    const sourceReference = await createAnsweredNotification(page)

    await copyNotification(page, sourceReference)

    for (const title of [
      hubCopy.rows.origin.title,
      hubCopy.rows.commodities.title,
      hubCopy.rows.importReason.title,
      hubCopy.rows.additionalDetails.title,
      hubCopy.rows.addresses.title
    ]) {
      await expectRowStatus(page, title, hubCopy.statuses.complete)
    }
    for (const title of [
      hubCopy.rows.consignmentDetails.title,
      hubCopy.rows.animalIdentification.title,
      hubCopy.rows.arrivalDetails.title,
      hubCopy.rows.transporter.title,
      hubCopy.rows.documents.title
    ]) {
      await expectRowStatus(page, title, hubCopy.statuses.toDo)
    }
    await expect(
      taskRow(page, hubCopy.rows.transitCountries.title)
    ).toHaveCount(0)
  })

  test('copy reads 0 animals and shows no packages figure on the overview, with no commodity line answered', async ({
    page
  }) => {
    const sourceReference = await createAnsweredNotification(page)

    await copyNotification(page, sourceReference)

    await expect(
      page.getByRole('region', {
        name: hubCopy.commodityTotals.animalsRegionLabel
      })
    ).toContainText('0')
    const packagesRegion = page.getByRole('region', {
      name: hubCopy.commodityTotals.packagesRegionLabel
    })
    await expect(packagesRegion).toContainText(
      hubCopy.commodityTotals.packagesLabel
    )
    await expect(packagesRegion).not.toContainText(/^\d/)
  })

  test("copy's origin page shows the source's internal reference number", async ({
    page
  }) => {
    const sourceReference = await createAnsweredNotification(page)

    await copyNotification(page, sourceReference)
    await openFromOverviewRow(page, hubCopy.rows.origin.title)

    await expect(
      page.getByLabel(originCopy.internalReference.label)
    ).toHaveValue(values.internalReferenceNumber)
    await expect(page.locator('select#countryOfOrigin-select')).toHaveValue(
      values.countryOfOrigin
    )
  })

  test("copy's commodity pages show the source's commodity, its selections and its selected species", async ({
    page
  }) => {
    const sourceReference = await createAnsweredNotification(page)

    await copyNotification(page, sourceReference)
    await openFromOverviewRow(page, hubCopy.rows.commodities.title)

    await expectSpeciesSelected(page, BOS_TAURUS_ROW)

    await openFromOverviewRow(page, hubCopy.rows.consignmentDetails.title)

    await expect(
      page.getByRole('heading', {
        level: 3,
        name: labelFor(BOS_TAURUS_ROW.speciesLatinName)
      })
    ).toBeVisible()
    await expect(
      page.getByLabel(commoditiesCopy.consignmentDetails.animals.label)
    ).toHaveValue('')
  })

  test("copy's import reason page shows the source's main reason and its internal market purpose follow-up", async ({
    page
  }) => {
    const sourceReference = await createAnsweredNotification(page)

    await copyNotification(page, sourceReference)
    await openFromOverviewRow(page, hubCopy.rows.importReason.title)

    await expect(
      page.getByRole('radio', { name: 'Internal market' })
    ).toBeChecked()
    await expect(page.getByRole('radio', { name: 'Breeding' })).toBeChecked()
  })

  test("copy's additional details page shows the source's certified-for and unweaned answers", async ({
    page
  }) => {
    const sourceReference = await createAnsweredNotification(page)

    await copyNotification(page, sourceReference)
    await openFromOverviewRow(page, hubCopy.rows.additionalDetails.title)

    await expect(page.getByRole('radio', { name: 'Slaughter' })).toBeChecked()
    await expect(
      page
        .getByRole('group', {
          name: 'Does the consignment contain any unweaned animals?'
        })
        .getByRole('radio', { name: 'No' })
    ).toBeChecked()
  })

  test('copy offers the transit countries page with no country chosen once a rail or road means of transport is saved on it', async ({
    page
  }) => {
    const sourceReference = await createAnsweredNotification(page)

    await copyNotification(page, sourceReference)
    await openFromOverviewRow(page, hubCopy.rows.arrivalDetails.title)
    await expect(
      page.getByRole('heading', { name: transportCopy.portOfEntry.title })
    ).toBeVisible()
    await chooseMeansAndSave(page, values.meansOfTransport, {
      landing: LANDINGS.transitCountries
    })

    await page
      .getByRole('link', {
        name: hubCopy.rows.transitCountries.title,
        exact: true
      })
      .click()

    await expect(
      page.getByRole('heading', { name: transportCopy.transitCountries.title })
    ).toBeVisible()
    await expect(page.getByRole('table')).toHaveCount(0)
  })

  test('copy leaves both source and copied notifications on the dashboard', async ({
    page
  }) => {
    const sourceReference = await createAnsweredNotification(page)
    await copyNotification(page, sourceReference)
    const copiedReference = journeyIdFromPage(page)

    await page.goto(BASE)

    await expect(
      page.getByRole('heading', { name: sourceReference, exact: true })
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { name: copiedReference, exact: true })
    ).toBeVisible()
  })

  test('copied notification hub has no serious or critical axe violations', async ({
    page
  }) => {
    const sourceReference = await createAnsweredNotification(page)
    await copyNotification(page, sourceReference)

    await expectNoSeriousOrCriticalViolations(page, 'Copied notification hub')
  })
})
