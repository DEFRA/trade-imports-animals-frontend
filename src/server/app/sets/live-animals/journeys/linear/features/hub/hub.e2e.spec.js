import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import {
  answerCountryOfOrigin,
  completeAnswerSections,
  startNotification
} from '../../../../../../../../../e2e/live-animals-journey.js'
import { copy } from './copy/copy.en.js'

const taskRow = (page, title) =>
  page.getByRole('listitem').filter({
    has: page.getByText(title, { exact: true })
  })

test.describe('hub feature', () => {
  test('renders navigation copy and initial task statuses', async ({
    page
  }) => {
    await startNotification(page)

    await expect(page.getByRole('heading', { name: copy.title })).toBeVisible()
    for (const caption of Object.values(copy.groups)) {
      await expect(page.getByRole('heading', { name: caption })).toBeVisible()
    }

    const origin = taskRow(page, copy.rows.origin.title)
    await expect(
      origin.getByRole('link', { name: copy.rows.origin.title })
    ).toBeVisible()
    await expect(origin).toContainText(copy.statuses.notYetStarted)

    const commodities = taskRow(page, copy.rows.commodities.title)
    await expect(commodities).toContainText(copy.statuses.cannotStartYet)
    await expect(
      commodities.getByRole('link', { name: copy.rows.commodities.title })
    ).toHaveCount(0)

    const review = taskRow(page, copy.rows.review.title)
    await expect(review).toContainText(copy.statuses.cannotStartYet)
    await expect(
      review.getByRole('link', { name: copy.rows.review.title })
    ).toHaveCount(0)
  })

  test('back link and return button navigate to the dashboard', async ({
    page
  }) => {
    await startNotification(page)

    await expect(
      page.getByRole('button', { name: copy.returnToDashboard })
    ).toHaveAttribute('href', '/live-animals')
    await expect(
      page.getByRole('link', { name: 'Back', exact: true })
    ).toHaveAttribute('href', '/live-animals')

    await page.getByRole('link', { name: 'Back', exact: true }).click()

    await expect(page).toHaveURL('/live-animals')
  })

  test('saved origin marks its task complete and unlocks commodities', async ({
    page
  }) => {
    await startNotification(page)
    await answerCountryOfOrigin(page)

    const origin = taskRow(page, copy.rows.origin.title)
    await expect(origin).toContainText(copy.statuses.completed)

    const commodities = taskRow(page, copy.rows.commodities.title)
    await expect(commodities).toContainText(copy.statuses.notYetStarted)
    await expect(
      commodities.getByRole('link', { name: copy.rows.commodities.title })
    ).toBeVisible()

    const review = taskRow(page, copy.rows.review.title)
    await expect(review).toContainText(copy.statuses.cannotStartYet)
  })
})

test.describe('hub feature — review readiness', () => {
  test('completed answers unlock Check and submit and open the review', async ({
    page
  }) => {
    test.slow()
    await startNotification(page)
    await completeAnswerSections(page)

    const review = taskRow(page, copy.rows.review.title)
    await expect(review).not.toContainText(copy.statuses.cannotStartYet)
    await expect(
      review.getByRole('link', { name: copy.rows.review.title })
    ).toHaveAttribute(
      'href',
      /^\/live-animals\/notifications\/[^/]+\/notification-view$/
    )

    await review.getByRole('link', { name: copy.rows.review.title }).click()

    await expect(
      page.getByRole('heading', { name: 'Check your answers' })
    ).toBeVisible()
  })

  test('blocked review hub has no serious or critical axe violations', async ({
    page
  }) => {
    await startNotification(page)

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
  })
})
