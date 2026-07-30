import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import {
  answerCountryOfOrigin,
  completeAnswerSections,
  startNotification
} from '../../../../../e2e/live-animals-journey.js'
import { copy } from './copy/copy.en.js'

const taskItem = (page, title) =>
  page.locator('.govuk-task-list__item', { hasText: title })

test.describe('hub feature', () => {
  test('renders initial task statuses, navigation copy and an axe-clean blocked review', async ({
    page
  }) => {
    await startNotification(page)

    await expect(page.getByRole('heading', { name: copy.title })).toBeVisible()
    for (const caption of Object.values(copy.groups)) {
      await expect(page.getByRole('heading', { name: caption })).toBeVisible()
    }

    const origin = taskItem(page, copy.rows.origin.title)
    await expect(
      origin.getByRole('link', { name: copy.rows.origin.title })
    ).toBeVisible()
    await expect(origin).toContainText(copy.statuses.notYetStarted)

    const commodities = taskItem(page, copy.rows.commodities.title)
    await expect(commodities).toContainText(copy.statuses.cannotStartYet)
    await expect(
      commodities.getByRole('link', { name: copy.rows.commodities.title })
    ).toHaveCount(0)

    const review = taskItem(page, copy.rows.review.title)
    await expect(review).toContainText(copy.statuses.cannotStartYet)
    await expect(
      review.getByRole('link', { name: copy.rows.review.title })
    ).toHaveCount(0)
    await expect(
      page.getByRole('button', { name: copy.returnToDashboard })
    ).toHaveAttribute('href', '/')
    await expect(page.locator('.govuk-back-link')).toHaveAttribute('href', '/')

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()
    const seriousOrCritical = results.violations.filter(({ impact }) =>
      ['serious', 'critical'].includes(impact)
    )
    expect(
      seriousOrCritical,
      `Hub has serious/critical accessibility violations.\nFull axe violations:\n${JSON.stringify(results.violations, null, 2)}`
    ).toEqual([])

    await page.locator('.govuk-back-link').click()
    await expect(page).toHaveURL('/')
  })

  test('updates row statuses after saved answers and only opens Check and submit when complete', async ({
    page
  }) => {
    test.slow()
    await startNotification(page)
    await answerCountryOfOrigin(page)

    const origin = taskItem(page, copy.rows.origin.title)
    await expect(origin).toContainText(copy.statuses.completed)
    const commodities = taskItem(page, copy.rows.commodities.title)
    await expect(commodities).toContainText(copy.statuses.notYetStarted)
    await expect(
      commodities.getByRole('link', { name: copy.rows.commodities.title })
    ).toBeVisible()
    await expect(taskItem(page, copy.rows.review.title)).toContainText(
      copy.statuses.cannotStartYet
    )

    await completeAnswerSections(page)

    const review = taskItem(page, copy.rows.review.title)
    await expect(review).not.toContainText(copy.statuses.cannotStartYet)
    await expect(
      review.getByRole('link', { name: copy.rows.review.title })
    ).toHaveAttribute('href', /\/notifications\/[^/]+\/notification-view$/)
    await review.getByRole('link', { name: copy.rows.review.title }).click()
    await expect(
      page.getByRole('heading', { name: 'Check your answers' })
    ).toBeVisible()
  })
})
