import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import {
  answerCountryOfOrigin,
  completeAnswerSections,
  selectSpecies,
  startNotification
} from '../../../../../../../../../fit/live-animals-journey.js'
import { copy } from './copy/copy.en.js'

const taskRow = (page, title) =>
  page.getByRole('listitem').filter({
    has: page.getByText(title, { exact: true })
  })

const seriousOrCritical = (violations) =>
  violations.filter(({ impact }) => ['serious', 'critical'].includes(impact))

const expectAxeClean = async (page, name) => {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze()
  expect(
    seriousOrCritical(results.violations),
    `${name} has serious/critical accessibility violations.\nFull axe violations:\n${JSON.stringify(results.violations, null, 2)}`
  ).toEqual([])
}

const ANIMALS = '25'
const PACKAGES = '5'
const TOTAL_BOX = '.app-commodity-total'

const openHubWithCommodityTotals = async (page) => {
  await startNotification(page)
  await answerCountryOfOrigin(page)
  await page.getByRole('link', { name: copy.rows.commodities.title }).click()
  await selectSpecies(page, ['Bos taurus'])
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await expect(
    page.getByRole('heading', { name: 'Consignment details' })
  ).toBeVisible()
  await page.getByLabel('Number of animals').fill(ANIMALS)
  await page.getByLabel('Number of packages (optional)').fill(PACKAGES)
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await expect(page.getByRole('heading', { name: copy.title })).toBeVisible()
}

test.describe('hub feature', () => {
  test('renders navigation copy and the task statuses of a newly entered journey', async ({
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
    await expect(origin).toContainText(copy.statuses.completed)

    const commodities = taskRow(page, copy.rows.commodities.title)
    await expect(commodities).toContainText(copy.statuses.notYetStarted)
    await expect(
      commodities.getByRole('link', { name: copy.rows.commodities.title })
    ).toBeVisible()

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
    ).toHaveAttribute('href', '/')
    await expect(
      page.getByRole('link', { name: 'Back', exact: true })
    ).toHaveAttribute('href', '/')

    await page.getByRole('link', { name: 'Back', exact: true }).click()

    await expect(page).toHaveURL('/')
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
    ).toHaveAttribute('href', /\/notifications\/[^/]+\/notification-view$/)

    await review.getByRole('link', { name: copy.rows.review.title }).click()

    await expect(
      page.getByRole('heading', { name: 'Check your answers' })
    ).toBeVisible()
  })

  test('blocked review hub has no serious or critical axe violations', async ({
    page
  }) => {
    await startNotification(page)

    await expectAxeClean(page, 'Hub')
  })
})

test.describe('hub feature — commodity totals', () => {
  test('each box reads as the number, then the label, then the caption', async ({
    page
  }) => {
    await openHubWithCommodityTotals(page)

    const boxes = page.locator(TOTAL_BOX)
    await expect(boxes).toHaveCount(2)
    await expect(boxes.nth(0).locator('> *')).toHaveText([
      ANIMALS,
      copy.commodityTotals.animalsLabel,
      copy.commodityTotals.animalsCaption
    ])
    await expect(boxes.nth(1).locator('> *')).toHaveText([
      PACKAGES,
      copy.commodityTotals.packagesLabel,
      copy.commodityTotals.packagesCaption
    ])

    await expect(
      page.getByRole('heading', {
        level: 2,
        name: copy.commodityTotals.heading
      })
    ).toBeVisible()
    await expect(
      page.getByRole('heading', {
        level: 3,
        name: copy.commodityTotals.animalsLabel
      })
    ).toBeVisible()
    await expect(
      page.getByRole('heading', {
        level: 3,
        name: copy.commodityTotals.packagesLabel
      })
    ).toBeVisible()

    const captions = await page
      .locator(`${TOTAL_BOX}__caption`)
      .evaluateAll((elements) =>
        elements.map((element) => ({
          text: element.textContent,
          height: element.getBoundingClientRect().height,
          lineHeight: parseFloat(getComputedStyle(element).lineHeight)
        }))
      )

    expect(captions).toHaveLength(2)
    for (const { text, height, lineHeight } of captions) {
      expect(
        height,
        `"${text}" wraps to more than two lines`
      ).toBeLessThanOrEqual(lineHeight * 2 + 1)
    }
  })

  test('the boxes are static panels styled from govuk design tokens', async ({
    page
  }) => {
    await openHubWithCommodityTotals(page)

    const boxes = page.locator(TOTAL_BOX)
    await expect(boxes).toHaveCount(2)
    await expect(boxes.getByRole('link')).toHaveCount(0)
    await expect(boxes.getByRole('button')).toHaveCount(0)

    const box = boxes.first()

    const styles = await box.evaluate((panel) => {
      const value = panel.querySelector('.app-commodity-total__value')
      const label = panel.querySelector('.app-commodity-total__label')
      const caption = panel.querySelector('.app-commodity-total__caption')
      return {
        background: getComputedStyle(panel).backgroundColor,
        valueColour: getComputedStyle(value).color,
        valueFontSize: getComputedStyle(value).fontSize,
        valueFontWeight: getComputedStyle(value).fontWeight,
        labelColour: getComputedStyle(label).color,
        labelFontSize: getComputedStyle(label).fontSize,
        labelFontWeight: getComputedStyle(label).fontWeight,
        labelMarginTop: getComputedStyle(label).marginTop,
        captionFontSize: getComputedStyle(caption).fontSize,
        captionColour: getComputedStyle(caption).color
      }
    })

    expect(styles).toEqual({
      background: 'rgb(243, 243, 243)',
      valueColour: 'rgb(29, 112, 184)',
      valueFontSize: '48px',
      valueFontWeight: '700',
      labelColour: 'rgb(29, 112, 184)',
      labelFontSize: '24px',
      labelFontWeight: '700',
      labelMarginTop: '0px',
      captionFontSize: '19px',
      captionColour: 'rgb(11, 12, 12)'
    })
  })

  test('the boxes stack with no horizontal overflow on a small screen', async ({
    page
  }) => {
    await page.setViewportSize({ width: 360, height: 740 })
    await openHubWithCommodityTotals(page)

    const boxes = page.locator(TOTAL_BOX)
    await expect(boxes).toHaveCount(2)
    const first = await boxes.nth(0).boundingBox()
    const second = await boxes.nth(1).boundingBox()

    expect(second.y).toBeGreaterThanOrEqual(first.y + first.height)

    const horizontalOverflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth
    )

    expect(horizontalOverflow).toBeLessThanOrEqual(0)
  })

  test('hub showing commodity totals has no serious or critical axe violations', async ({
    page
  }) => {
    await openHubWithCommodityTotals(page)

    await expect(
      page.getByRole('heading', { name: copy.commodityTotals.heading })
    ).toBeVisible()

    await expectAxeClean(page, 'Hub with commodity totals')
  })
})
