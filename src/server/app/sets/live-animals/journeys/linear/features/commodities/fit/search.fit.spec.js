import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import {
  answerCountryOfOrigin,
  selectSpecies,
  startNotification
} from '../../../../../../../../../../fit/live-animals-journey.js'
import { copy } from '../copy/copy.en.js'

const BISON_BISON = 'Bison bison'
const BOS_TAURUS = 'Bos taurus'
const FELIS_CATUS = 'Felis catus'

const canonicalSelectionOrder = [BISON_BISON, BOS_TAURUS, FELIS_CATUS]

const expectedGroups = [
  ['Cow (0102)', [BISON_BISON, 'Bos spp.', BOS_TAURUS, 'Bubalus bubalis']],
  ['Horse (0101)', ['Equus caballus']],
  ['Cat (01061900)', [FELIS_CATUS]],
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
  test.beforeEach(async ({ page }) => {
    await openSelection(page)
  })

  test('renders all eight pairs in commodity groups with grounded copy', async ({
    page
  }) => {
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
  })

  test('back link returns to the overview', async ({ page }) => {
    await page.locator('.govuk-back-link').click()
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
  })

  test('validation: no commodity links to and focuses the first checkbox while keeping the checklist', async ({
    page
  }) => {
    await page.getByRole('button', { name: 'Save and continue' }).click()

    const link = errorLink(page, copy.search.errors.selectCommodity)
    await expect(link).toBeVisible()
    await link.click()
    await expect(page.getByRole('checkbox').first()).toBeFocused()
    await expect(page.getByRole('checkbox', { checked: true })).toHaveCount(0)
    await expect(page.getByRole('checkbox')).toHaveCount(8)
  })

  test('saves multiple pairs in canonical order and persists checked state', async ({
    page
  }) => {
    await selectSpecies(page, [FELIS_CATUS, BOS_TAURUS, BISON_BISON])
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await expect(
      page.getByRole('heading', { name: copy.consignmentDetails.title })
    ).toBeVisible()
    const speciesHeadings = await page
      .locator('h3.govuk-heading-s')
      .allTextContents()
    expect(speciesHeadings).toEqual(canonicalSelectionOrder)

    await page.locator('.govuk-back-link').click()
    for (const name of canonicalSelectionOrder) {
      await expect(page.getByRole('checkbox', { name })).toBeChecked()
    }
    await expect(
      page.getByRole('checkbox', { name: 'Canis lupus familiaris' })
    ).not.toBeChecked()
  })

  test('has no serious or critical axe violations', async ({ page }) => {
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
