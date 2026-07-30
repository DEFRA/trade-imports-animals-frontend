import { expect, test } from '@playwright/test'

import {
  answerCountryOfOrigin,
  searchAndSelect,
  startNotification,
  values
} from '../../../../../../e2e/live-animals-journey.js'
import { copy } from '../copy/copy.en.js'

const openSearch = async (page) => {
  await startNotification(page)
  await answerCountryOfOrigin(page)
  await page.getByRole('link', { name: 'What are you importing?' }).click()
  await expect(
    page.getByRole('heading', { name: copy.search.title })
  ).toBeVisible()
}

const errorLink = (page, message) =>
  page.locator('.govuk-error-summary').getByRole('link', { name: message })

test.describe('commodity search and selection', () => {
  test('renders grounded search copy, no-match state, type filtering and back link', async ({
    page
  }) => {
    await openSearch(page)

    await expect(page.getByText(copy.search.inset)).toBeVisible()
    await expect(
      page.getByLabel(copy.search.search.label)
    ).toHaveAccessibleDescription(copy.search.search.hint)
    await page.getByLabel(copy.search.search.label).fill('not-a-commodity')
    await page
      .getByRole('button', { name: copy.search.search.button, exact: true })
      .click()
    await expect(page.getByText(copy.search.noMatches)).toBeVisible()

    await page.getByLabel(copy.search.search.label).fill('0102')
    await page
      .getByRole('button', { name: copy.search.search.button, exact: true })
      .click()
    await expect(page.getByRole('group', { name: 'Cow (0102)' })).toBeVisible()
    await expect(
      page.getByLabel(copy.search.typeFilter.label)
    ).toHaveAccessibleDescription(copy.search.typeFilter.hint)
    await page.getByLabel(copy.search.typeFilter.label).selectOption({
      label: 'Game'
    })
    await page
      .getByRole('button', { name: copy.search.typeFilter.button })
      .click()
    await expect(page.getByRole('checkbox', { name: 'Bos spp.' })).toBeVisible()
    await expect(
      page.getByRole('checkbox', { name: 'Bos taurus' })
    ).toHaveCount(0)

    await expect(
      page.getByText(copy.search.help.summary, { exact: true })
    ).toBeVisible()
    await page.locator('.govuk-back-link').click()
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
  })

  test('requires a selection and preserves the submitted search', async ({
    page
  }) => {
    await openSearch(page)
    await page.getByLabel(copy.search.search.label).fill('Cow')
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await expect(
      errorLink(page, copy.search.errors.selectCommodity)
    ).toBeVisible()
    await expect(page.getByLabel(copy.search.search.label)).toHaveValue('Cow')
  })

  test('selects across commodity codes, removes a selection and persists the remainder', async ({
    page
  }) => {
    await openSearch(page)
    await searchAndSelect(page, '0102', ['Bos taurus', 'Bison bison'])
    await searchAndSelect(page, 'Felis catus', ['Felis catus'])

    await expect(
      page.getByRole('heading', { name: copy.search.selectedCount(2) })
    ).toBeVisible()
    await page
      .getByRole('button', {
        name: copy.search.removeAria('Cow (0102) — Bison bison')
      })
      .click()
    await expect(
      page.getByRole('heading', { name: copy.search.selectedCount(2) })
    ).toBeVisible()
    await expect(page.getByText('Cat (01061900) — Felis catus')).toBeVisible()
    await expect(page.getByText('Cow (0102) — Bison bison')).toHaveCount(0)

    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(
      page.getByRole('heading', { name: copy.consignmentDetails.title })
    ).toBeVisible()
    await expect(page.locator('.govuk-table')).toContainText('Cow')
    await expect(page.locator('.govuk-table')).toContainText('Cat')

    await page.locator('#numberOfAnimalsQuantity-0').fill('2')
    await page.locator('#numberOfPackages-0').fill('1')
    await page.locator('#numberOfAnimalsQuantity-1').fill('3')
    await page.locator('#numberOfPackages-1').fill('2')
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()

    await page.getByRole('link', { name: 'What are you importing?' }).click()
    await expect(
      page.getByRole('heading', { name: copy.search.selectedCount(2) })
    ).toBeVisible()
    await expect(
      page.getByText(
        `Cow (0102) — ${values.commodityLines[0].speciesSelection}`,
        { exact: true }
      )
    ).toHaveCount(0)
    await expect(page.getByText('Cow (0102) — Bos taurus')).toBeVisible()
    await expect(page.getByText('Cat (01061900) — Felis catus')).toBeVisible()
  })
})
