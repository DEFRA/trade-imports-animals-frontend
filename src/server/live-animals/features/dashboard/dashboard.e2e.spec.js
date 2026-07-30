import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import {
  completeAnswerSections,
  journeyIdFromPage,
  startNotification,
  values
} from '../../../../../e2e/live-animals-journey.js'
import { copy } from './copy/copy.en.js'

const cardFor = (page, reference) =>
  page.locator('.govuk-summary-card', { hasText: reference })

const submitNotification = async (page) => {
  await completeAnswerSections(page)
  await page.getByRole('link', { name: 'Check and submit' }).click()
  await page.getByRole('button', { name: 'Continue' }).click()
  await page
    .getByRole('checkbox', { name: /I confirm that I have reviewed/ })
    .check()
  await page.getByRole('button', { name: 'Continue' }).click()
}

test.describe('dashboard feature', () => {
  test('renders the empty list copy, starts at the import-type filter and is axe clean', async ({
    page
  }) => {
    await page.goto('/')

    await expect(page.getByRole('heading', { name: copy.title })).toBeVisible()
    await expect(page.getByText(copy.body)).toBeVisible()
    await expect(
      page.getByRole('heading', { name: copy.notificationsHeading })
    ).toBeVisible()
    await expect(page.getByText(copy.pagination.results.none)).toBeVisible()
    await expect(page.getByText(copy.emptyText)).toBeVisible()
    await expect(page.getByLabel(copy.sort.label)).toHaveValue(
      'arrivalDate,desc'
    )

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()
    const seriousOrCritical = results.violations.filter(({ impact }) =>
      ['serious', 'critical'].includes(impact)
    )
    expect(
      seriousOrCritical,
      `Dashboard has serious/critical accessibility violations.\nFull axe violations:\n${JSON.stringify(results.violations, null, 2)}`
    ).toEqual([])

    await page.getByRole('button', { name: copy.startButton }).click()
    await expect(
      page.getByRole('heading', { name: 'What are you importing?' })
    ).toBeVisible()
    await expect(page).toHaveURL(/\/notifications\/[^/]+\/import-type$/)
  })

  test('renders seeded row data and the actions for submitted, draft and amending statuses', async ({
    page
  }) => {
    test.slow()
    await startNotification(page)
    await submitNotification(page)
    const submittedReference = journeyIdFromPage(page)

    await page.goto('/')
    let submittedCard = cardFor(page, submittedReference)
    await expect(submittedCard).toContainText('Cow')
    await expect(submittedCard).toContainText('France')
    await expect(submittedCard).toContainText('12 Dec 2026')
    await expect(submittedCard).toContainText(values.consignor.name)
    await expect(submittedCard).toContainText(values.consignee.name)
    await expect(
      submittedCard.getByText('Submitted', { exact: true })
    ).toBeVisible()
    await expect(
      submittedCard.getByRole('link', {
        name: `View ${copy.actionHidden(submittedReference)}`
      })
    ).toBeVisible()
    await expect(
      submittedCard.getByRole('button', {
        name: `Amend ${copy.actionHidden(submittedReference)}`
      })
    ).toBeVisible()
    await expect(
      submittedCard.getByRole('button', {
        name: `Copy as new ${copy.actionHidden(submittedReference)}`
      })
    ).toBeVisible()
    await expect(
      submittedCard.getByRole('link', {
        name: `Delete ${copy.actionHidden(submittedReference)}`
      })
    ).toBeVisible()

    await startNotification(page)
    const draftReference = journeyIdFromPage(page)
    await page.goto('/')
    const draftCard = cardFor(page, draftReference)
    await expect(draftCard.getByText('Draft', { exact: true })).toBeVisible()
    await expect(
      draftCard.getByRole('link', {
        name: `Resume ${copy.actionHidden(draftReference)}`
      })
    ).toBeVisible()
    await expect(
      draftCard.getByRole('button', {
        name: `Copy as new ${copy.actionHidden(draftReference)}`
      })
    ).toBeVisible()
    await expect(
      draftCard.getByRole('link', {
        name: `Delete ${copy.actionHidden(draftReference)}`
      })
    ).toBeVisible()
    await expect(draftCard.getByRole('link', { name: /^View/ })).toHaveCount(0)
    await expect(draftCard.getByRole('button', { name: /^Amend/ })).toHaveCount(
      0
    )

    submittedCard = cardFor(page, submittedReference)
    await submittedCard
      .getByRole('button', {
        name: `Amend ${copy.actionHidden(submittedReference)}`
      })
      .click()
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()

    await page.goto('/')
    submittedCard = cardFor(page, submittedReference)
    await expect(
      submittedCard.getByText('Amending', { exact: true })
    ).toBeVisible()
    await expect(
      submittedCard.getByRole('link', {
        name: `Resume ${copy.actionHidden(submittedReference)}`
      })
    ).toBeVisible()
    await expect(
      submittedCard.getByRole('link', {
        name: `Cancel amendment ${copy.actionHidden(submittedReference)}`
      })
    ).toBeVisible()
  })

  test('paginates at the 20-row boundary and preserves the selected sort', async ({
    page
  }) => {
    test.slow()
    await page.goto('/')
    for (let index = 0; index < 21; index += 1) {
      await page.getByRole('button', { name: copy.startButton }).click()
      await page.goto('/')
    }

    await expect(page.locator('.govuk-summary-card')).toHaveCount(20)
    await expect(
      page.getByText(copy.pagination.results.many(1, 20, 21))
    ).toBeVisible()
    await expect(
      page.getByRole('link', { name: copy.pagination.previous })
    ).toHaveCount(0)
    await page.getByRole('link', { name: copy.pagination.next }).click()

    await expect(page).toHaveURL('/?page=2')
    await expect(page.locator('.govuk-summary-card')).toHaveCount(1)
    await expect(
      page.getByText(copy.pagination.results.oneOf(21, 21))
    ).toBeVisible()
    await expect(
      page.getByRole('link', { name: copy.pagination.next })
    ).toHaveCount(0)
    await expect(
      page.getByRole('link', { name: copy.pagination.previous })
    ).toBeVisible()

    await page.getByLabel(copy.sort.label).selectOption('createdAt,asc')
    await page.getByRole('button', { name: copy.sort.update }).click()
    await expect(page).toHaveURL('/?page=2&sort=createdAt%2Casc')
    await expect(page.getByLabel(copy.sort.label)).toHaveValue('createdAt,asc')
    await expect(page.locator('.govuk-summary-card')).toHaveCount(1)
  })
})
