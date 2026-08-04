import { expect, test } from '@playwright/test'

import { copy as sharedCopy } from '../../../../../../shared/copy.en.js'
import { axeViolations } from '../axe.e2e-helper.js'
import { copy as dashboardCopy } from '../dashboard/copy/copy.en.js'
import {
  completeJourney,
  fullJourneyValues,
  submitDeclaration
} from '../journey.e2e-helper.js'
import { copy as originCopy } from '../origin/copy/copy.en.js'
import { copy } from './copy/copy.en.js'

const actionName = (text, reference) =>
  `${text} ${dashboardCopy.actions.forNotification(reference)}`

const rowFor = (page, reference) =>
  page.getByRole('row', { name: new RegExp(reference) })

const expectAxeClean = async (page) => {
  const { all, seriousOrCritical } = await axeViolations(page)
  expect(
    seriousOrCritical,
    `Cancel amendment has serious/critical accessibility violations.\nFull axe violations:\n${JSON.stringify(all, null, 2)}`
  ).toEqual([])
}

test.describe('plant-products cancel-amend feature', () => {
  test('amends by reference, keeps a declined cancellation, then restores the submitted answer', async ({
    page
  }) => {
    test.slow()
    const { reference } = await completeJourney(page, { profile: 'full' })
    await page.getByRole('link', { name: 'Back', exact: true }).click()
    await submitDeclaration(page)
    await page.goto('/plant-products')

    const submittedRow = rowFor(page, reference)
    await expect(
      submittedRow.getByRole('link', {
        name: actionName(dashboardCopy.actions.view, reference),
        exact: true
      })
    ).toHaveAttribute(
      'href',
      `/plant-products/notifications/${reference}/review-notification`
    )
    await submittedRow
      .getByRole('button', {
        name: actionName(dashboardCopy.actions.amend, reference),
        exact: true
      })
      .click()

    await expect(page).toHaveURL(`/plant-products/notifications/${reference}`)
    await page.goto('/plant-products')
    const amendRow = rowFor(page, reference)
    await expect(
      amendRow.getByRole('link', {
        name: actionName(dashboardCopy.actions.cancelAmend, reference),
        exact: true
      })
    ).toHaveAttribute(
      'href',
      `/plant-products/notifications/${reference}/cancel-amend`
    )
    await amendRow
      .getByRole('link', {
        name: actionName(dashboardCopy.actions.resume, reference),
        exact: true
      })
      .click()

    await page
      .getByRole('link', { name: 'Review and submit', exact: true })
      .click()
    await expect(
      page.getByRole('link', { name: copy.link, exact: true })
    ).toBeVisible()
    await page
      .getByRole('link', { name: 'Change Internal reference', exact: true })
      .click()
    await page
      .getByLabel(originCopy.originOfImport.internalReference.label)
      .fill('DISCARD-PP-101')
    await page
      .getByRole('button', { name: 'Save and continue', exact: true })
      .click()
    await expect(
      page.getByText('DISCARD-PP-101', { exact: true })
    ).toBeVisible()

    await page.getByRole('link', { name: copy.link, exact: true }).click()
    await expect(page).toHaveURL(
      `/plant-products/notifications/${reference}/cancel-amend`
    )
    await expect(
      page.getByRole('heading', { name: copy.title, exact: true })
    ).toBeVisible()
    await expect(page.getByText(copy.body, { exact: true })).toBeVisible()
    await expect(
      page.getByRole('link', { name: 'Back', exact: true })
    ).toHaveAttribute(
      'href',
      `/plant-products/notifications/${reference}/review-notification`
    )
    await expectAxeClean(page)

    await page.getByRole('button', { name: copy.noLink, exact: true }).click()
    await expect(
      page.getByText('DISCARD-PP-101', { exact: true })
    ).toBeVisible()
    await page.getByRole('link', { name: copy.link, exact: true }).click()
    await page
      .getByRole('button', { name: copy.confirmButton, exact: true })
      .click()

    await expect(page).toHaveURL(
      `/plant-products/notifications/${reference}/review-notification?cancelled=1`
    )
    await expect(
      page.getByText(copy.successTitle, { exact: true })
    ).toBeVisible()
    await expect(
      page.getByText(copy.successBody, { exact: true })
    ).toBeVisible()
    await expect(
      page.getByText(sharedCopy.journeyStrip.submitted, { exact: true })
    ).toBeVisible()
    await expect(page.getByText('DISCARD-PP-101', { exact: true })).toHaveCount(
      0
    )
    await expect(
      page.getByText(fullJourneyValues.internalReference, { exact: true })
    ).toBeVisible()
    await expect(
      page.getByRole('link', { name: copy.link, exact: true })
    ).toHaveCount(0)
    await expect(page.getByRole('link', { name: /^Change / })).toHaveCount(0)
  })
})
