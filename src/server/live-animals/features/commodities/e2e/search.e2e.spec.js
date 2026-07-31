import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import {
  answerCountryOfOrigin,
  selectSpecies,
  startNotification
} from '../../../../../../e2e/live-animals-journey.js'
import { copy } from '../copy/copy.en.js'

const expectedGroups = [
  ['Cow (0102)', ['Bison bison', 'Bos spp.', 'Bos taurus', 'Bubalus bubalis']],
  ['Horse (0101)', ['Equus caballus']],
  ['Cat (01061900)', ['Felis catus']],
  ['Dog (01061900)', ['Canis lupus familiaris']],
  ['Fish (0301)', ['Salmo salar']]
]

const openSelection = async (page) => {
  await startNotification(page)
  await answerCountryOfOrigin(page)
  await page.getByRole('link', { name: 'What are you importing?' }).click()
  await expect(
    page.getByRole('heading', { name: copy.search.title })
  ).toBeVisible()
}

const errorLink = (page, message) =>
  page.locator('.govuk-error-summary').getByRole('link', { name: message })

test.describe('commodity selection', () => {
  test('renders all eight pairs in commodity groups with grounded copy and a working back link', async ({
    page
  }) => {
    await openSelection(page)

    await expect(page.getByText(copy.search.inset)).toBeVisible()
    for (const [legend, species] of expectedGroups) {
      const group = page.getByRole('group', { name: legend })
      await expect(group).toBeVisible()
      for (const name of species) {
        await expect(group.getByRole('checkbox', { name })).toBeVisible()
      }
    }
    await expect(page.getByRole('checkbox')).toHaveCount(8)
    await expect(page.getByRole('textbox')).toHaveCount(0)
    await expect(
      page.getByRole('button', { name: 'Search', exact: true })
    ).toHaveCount(0)
    await expect(
      page.getByText(copy.search.help.summary, { exact: true })
    ).toBeVisible()

    await page.locator('.govuk-back-link').click()
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
  })

  test('requires at least one pair and keeps the full checklist available', async ({
    page
  }) => {
    await openSelection(page)
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await expect(
      errorLink(page, copy.search.errors.selectCommodity)
    ).toBeVisible()
    await expect(page.getByRole('checkbox')).toHaveCount(8)
  })

  test('saves multiple pairs in canonical order and persists checked state', async ({
    page
  }) => {
    await openSelection(page)
    await selectSpecies(page, ['Felis catus', 'Bos taurus', 'Bison bison'])
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await expect(
      page.getByRole('heading', { name: copy.consignmentDetails.title })
    ).toBeVisible()
    const speciesHeadings = await page
      .locator('h3.govuk-heading-s')
      .allTextContents()
    expect(speciesHeadings).toEqual([
      'Bison bison',
      'Bos taurus',
      'Felis catus'
    ])

    await page.locator('.govuk-back-link').click()
    for (const name of ['Bison bison', 'Bos taurus', 'Felis catus']) {
      await expect(page.getByRole('checkbox', { name })).toBeChecked()
    }
    await expect(
      page.getByRole('checkbox', { name: 'Canis lupus familiaris' })
    ).not.toBeChecked()
  })

  test('has no serious or critical axe violations', async ({ page }) => {
    await openSelection(page)
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()
    const violations = results.violations.filter(({ impact }) =>
      ['serious', 'critical'].includes(impact)
    )
    expect(
      violations,
      `Commodity selection has serious/critical accessibility violations.\n${JSON.stringify(results.violations, null, 2)}`
    ).toEqual([])
  })
})
