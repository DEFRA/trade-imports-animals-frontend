import { expect, test } from '@playwright/test'

import { copy as sharedCopy } from '../../../../../../shared/copy.en.js'
import { axeViolations } from '../axe.e2e-helper.js'
import { copy as dashboardCopy } from '../dashboard/copy/copy.en.js'
import {
  completeJourney,
  startNotification,
  submitDeclaration
} from '../journey.e2e-helper.js'
import { copy } from './copy/copy.en.js'

const DASHBOARD_PATH = '/plant-products'

const expectAxeClean = async (page) => {
  const { all, seriousOrCritical } = await axeViolations(page)
  expect(
    seriousOrCritical,
    `Delete notification has serious/critical accessibility violations.\nFull axe violations:\n${JSON.stringify(all, null, 2)}`
  ).toEqual([])
}

test.describe('plant-products delete-notification feature', () => {
  test('dashboard entry can be cancelled or confirmed for the referenced draft', async ({
    page
  }) => {
    const reference = await startNotification(page)
    await page.goto(DASHBOARD_PATH)
    const row = page.getByRole('row', { name: new RegExp(reference) })
    const deleteLink = row.getByRole('link', {
      name: `${sharedCopy.notificationActions.delete.text} ${dashboardCopy.actions.forNotification(reference)}`,
      exact: true
    })

    await deleteLink.click()

    await expect(page).toHaveURL((url) =>
      new RegExp(`^/plant-products/notifications/${reference}/delete$`).test(
        url.pathname
      )
    )
    await expect(
      page.getByRole('heading', { name: copy.title, exact: true })
    ).toBeVisible()
    await expect(page.getByText(reference, { exact: true })).toBeVisible()
    await expect(
      page.getByRole('button', { name: copy.noLink, exact: true })
    ).toHaveAttribute('href', DASHBOARD_PATH)
    await expectAxeClean(page)

    await page.getByRole('button', { name: copy.noLink, exact: true }).click()

    await expect(page).toHaveURL(DASHBOARD_PATH)
    await expect(
      page.getByRole('row', { name: new RegExp(reference) })
    ).toBeVisible()

    await page
      .getByRole('row', { name: new RegExp(reference) })
      .getByRole('link', {
        name: `${sharedCopy.notificationActions.delete.text} ${dashboardCopy.actions.forNotification(reference)}`,
        exact: true
      })
      .click()
    await page
      .getByRole('button', { name: copy.confirmButton, exact: true })
      .click()

    await expect(page).toHaveURL('/plant-products?deleted=1')
    await expect(
      page.getByText(sharedCopy.notificationActions.delete.successTitle)
    ).toBeVisible()
    await expect(
      page.getByText(sharedCopy.notificationActions.delete.successBody)
    ).toBeVisible()
    await expect(
      page.getByRole('row', { name: new RegExp(reference) })
    ).toHaveCount(0)
  })

  test('read-only review entry cancels back to the referenced submitted review', async ({
    page
  }) => {
    test.slow()
    const { reference } = await completeJourney(page)
    await page.getByRole('link', { name: 'Back', exact: true }).click()
    await submitDeclaration(page)
    const reviewPath = `/plant-products/notifications/${reference}/review-notification`
    await page.goto(reviewPath)

    await page
      .getByRole('button', {
        name: sharedCopy.notificationActions.delete.text,
        exact: true
      })
      .click()

    await expect(page).toHaveURL(
      `${reviewPath.replace(/\/review-notification$/, '/delete')}?source=notification-view`
    )
    await expect(page.getByText(reference, { exact: true })).toBeVisible()
    await expect(
      page.getByRole('button', { name: copy.noLink, exact: true })
    ).toHaveAttribute('href', reviewPath)

    await page.getByRole('button', { name: copy.noLink, exact: true }).click()

    await expect(page).toHaveURL(reviewPath)
    await expect(page.getByText(reference, { exact: true })).toBeVisible()
    await expect(
      page.getByRole('button', {
        name: sharedCopy.notificationActions.delete.text,
        exact: true
      })
    ).toBeVisible()
  })
})
