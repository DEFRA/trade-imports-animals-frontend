import { expect, test } from '@playwright/test'

import { copy as sharedCopy } from '../../../../../../shared/copy.en.js'
import { axeViolations } from '../axe.e2e-helper.js'
import { copy as dashboardCopy } from '../dashboard/copy/copy.en.js'
import { copy as hubCopy } from '../hub/copy/copy.en.js'
import {
  completeJourney,
  journeyIdFromPage,
  submitDeclaration
} from '../journey.e2e-helper.js'

const hubUrl = /^\/plant-products\/notifications\/GBN-PP-[^/]+$/
const copyActionUrl = /^\/plant-products\/notifications\/GBN-PP-[^/]+\/copy$/

const expectAxeClean = async (page, surface) => {
  const { all, seriousOrCritical } = await axeViolations(page)
  expect(
    seriousOrCritical,
    `${surface} has serious/critical accessibility violations.\nFull axe violations:\n${JSON.stringify(all, null, 2)}`
  ).toEqual([])
}

const submitJourney = async (page) => {
  const { reference } = await completeJourney(page)
  await page.getByRole('link', { name: 'Back', exact: true }).click()
  await submitDeclaration(page)
  return reference
}

test.describe('plant-products notification-actions feature', () => {
  test('copies from the read-only review to a documentless draft under the plant prefix', async ({
    page
  }) => {
    test.slow()
    const { reference: sourceReference } = await completeJourney(page)

    await expect(
      page.getByRole('button', {
        name: sharedCopy.notificationActions.copy.text,
        exact: true
      })
    ).toHaveCount(0)

    await page.getByRole('link', { name: 'Back', exact: true }).click()
    await submitDeclaration(page)
    await page.goto(
      `/plant-products/notifications/${sourceReference}/review-notification`
    )

    const copyButton = page.getByRole('button', {
      name: sharedCopy.notificationActions.copy.text,
      exact: true
    })
    const copyForm = copyButton.locator('..')
    await expect(copyForm).toHaveAttribute('method', 'post')
    await expect(copyForm).toHaveAttribute('action', copyActionUrl)
    await expect(
      copyForm.locator('input[name="idempotencyKey"]')
    ).toHaveAttribute('value', /.+/)
    await expectAxeClean(page, 'Submitted review Copy action')

    await copyButton.click()

    await expect(page).toHaveURL((url) => hubUrl.test(url.pathname))
    const copiedReference = journeyIdFromPage(page)
    expect(copiedReference).not.toBe(sourceReference)
    await expect(page.getByText('Draft', { exact: true })).toBeVisible()
    const documentsRow = page.getByRole('listitem').filter({
      has: page.getByText(hubCopy.rows.documents.title, { exact: true })
    })
    await expect(documentsRow).toContainText(hubCopy.statuses.notYetStarted)
  })

  test('copies the referenced submitted dashboard row under the plant prefix', async ({
    page
  }) => {
    test.slow()
    const sourceReference = await submitJourney(page)
    await page.goto('/plant-products')

    const sourceRow = page.getByRole('row', {
      name: new RegExp(sourceReference)
    })
    const copyButton = sourceRow.getByRole('button', {
      name: `${sharedCopy.notificationActions.copy.text} ${dashboardCopy.actions.forNotification(sourceReference)}`,
      exact: true
    })
    const copyForm = copyButton.locator('..')
    await expect(copyForm).toHaveAttribute('method', 'post')
    await expect(copyForm).toHaveAttribute('action', copyActionUrl)
    await expect(copyForm.locator('input[name="copyOrigin"]')).toHaveValue(
      'dashboard'
    )
    await expectAxeClean(page, `Dashboard Copy action for ${sourceReference}`)

    await copyButton.click()

    await expect(page).toHaveURL((url) => hubUrl.test(url.pathname))
    const copiedReference = journeyIdFromPage(page)
    expect(copiedReference).not.toBe(sourceReference)
    await expect(page.getByText('Draft', { exact: true })).toBeVisible()
  })
})
